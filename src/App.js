import React, { useState, useEffect } from 'react'
import ReactTooltip from 'react-tooltip'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faVideo,
  faTrash,
  faExternalLinkAlt,
  faTimes,
  faPlus,
  faSpinner,
  faLock
} from '@fortawesome/free-solid-svg-icons'

import { faGithub } from '@fortawesome/free-brands-svg-icons'

import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'

const { ipc } = window

function App () {
  const [camIdInputValue, setCamIdInputValue] = useState('')
  const [password, setPassword] = useState('')
  const [showAddCameraForm, setShowAddCameraForm] = useState(false)
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [error, setError] = useState('')
  const [validatingCamera, setValidatingCamera] = useState(false)
  const [cameras, setCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState('')
  const [isValid, setIsValid] = useState(false)

  const fetchCameras = () => {
    setCameras(ipc.sendSync('fetch-cameras'))
  }

  const validateCamera = e => {
    e.preventDefault()
    setValidatingCamera(true)
    setError('')

    // pull out the id
    const [, id] = camIdInputValue.match(/https:\/\/video\.nest\.com\/live\/([a-zA-Z0-9]{10})/)

    ipc.send('validate-camera', {
      id,
      password
    })
  }

  const popoutCamera = (e, id) => {
    e.stopPropagation()
    // if it's the currently selected camera, hide it
    if (id === selectedCamera) {
      hideCamera(e)
    }

    const { screenX, screenY } = e
    ipc.send('popout-camera', id, screenX, screenY)
  }

  const removeCamera = (e, id) => {
    e.stopPropagation()
    if (id === selectedCamera) {
      hideCamera(e)
    }

    setCameras(ipc.sendSync('remove-camera', id))
  }

  const showCamera = (id) => {
    setSelectedCamera(ipc.sendSync('show-camera', id))
  }

  const hideCamera = (e) => {
    e.stopPropagation()
    setSelectedCamera(ipc.sendSync('hide-camera'))
  }

  const handleAddCameraClick = () => {
    setShowAddCameraForm(true)
  }

  const handleCamIdInputChange = (value) => {
    setCamIdInputValue(value)

    // check the value to see if it is valid
    setIsValid(!!value.trim().match(/^https:\/\/video\.nest\.com\/live\/[a-zA-Z0-9]{10}$/))
  }

  const handleCancel = () => {
    setShowAddCameraForm(false)
    setShowPasswordInput(false)
    setCamIdInputValue('')
    setPassword('')
  }

  const openExternalLink = (url) => {
    ipc.send('open-external-link', url)
  }

  useEffect(() => {
    fetchCameras()
    ipc.on('validate-camera-response', (event, response) => {
      setValidatingCamera(false)

      const { status, message } = response
      if (status === 'error') {
        if (message === 'password-protected') {
          setShowPasswordInput(true)
        } else {
          setError(message)
        }
      } else {
        // reset the forms
        setShowAddCameraForm(false)
        setShowPasswordInput(false)
        setError('')
        setCamIdInputValue('')
        setPassword('')

        // fetch the camera list
        fetchCameras()

        // load the camera
        showCamera(message)
      }
    })
  }, [])

  useEffect(() => {
    ReactTooltip.rebuild()
  }, [cameras])

  let camerasList = (<p className='no-cameras'>No Cameras <span role='img' aria-label='sad emoji'>😢</span></p>)

  if (cameras.length) {
    camerasList = cameras.map(({ id, name }) => {
      const selected = id === selectedCamera
      return (
        <div className={`camera-list-item ${selected && 'selected'}`} key={id} onClick={() => { showCamera(id) }}>
          {
            selected && (
              <div className='selected-container'>
                <div className='selected-marker'/>
                <div className='selected-close-button' onClick={hideCamera}>
                  <FontAwesomeIcon icon={faTimes}/>
                </div>
              </div>
            )
          }
          <div className='camera-name'>{name}</div>
          <div className='camera-button' data-tip='Pop-out Camera' onClick={(e) => { popoutCamera(e, id) }}><FontAwesomeIcon icon={faExternalLinkAlt} /></div>
          <div className='camera-button' data-tip='Delete Camera' onClick={(e) => { removeCamera(e, id) }}><FontAwesomeIcon icon={faTrash} /></div>
        </div>
      )
    })
  }

  return (
    <div className="App">
      <div className={`header-container ${selectedCamera && 'collapsed'}`}>
        <h1 className="title"><FontAwesomeIcon icon={faVideo} /> Cam View</h1>
        <p>A Desktop Viewer for Nest Cams</p>
      </div>
      <div className='camera-list-container'>
        <h5>Cameras</h5>
        <div className='camera-list'>
          {camerasList}
        </div>
        <hr/>
        <div className='add-camera-container' >
          {
            !showAddCameraForm && (
              <div className='add-camera-button' onClick={handleAddCameraClick}>
                <FontAwesomeIcon icon={faPlus} />
                  Add camera
              </div>
            )
          }
          {
            showAddCameraForm && (
              <form className="commentForm" onSubmit={validateCamera}>
                {
                  !showPasswordInput && (
                    <input ref={input => input && input.focus()} type="text" id="cam-id" name="cam-id" placeholder="https://video.nest.com/live/xXxxXXxXXX" value={camIdInputValue} onChange={e => handleCamIdInputChange(e.target.value)} />
                  )
                }
                {
                  showPasswordInput && (
                    <div className='password-input-container'>
                      <FontAwesomeIcon icon={faLock} />
                      <input ref={input => input && input.focus()} type="password" id="password" name="password" placeholder="password required" value={password} onChange={e => setPassword(e.target.value)}/>
                    </div>
                  )
                }
                <button type='submit' disabled={!isValid}>
                  {
                    validatingCamera && (
                      <FontAwesomeIcon icon={faSpinner} spin />
                    )
                  }
                  {
                    !validatingCamera && ('Add Camera')
                  }

                </button>

                <div className='cancel-link' onClick={handleCancel}>Cancel</div>
                <div className='error-text'>{error}</div>
              </form>
            )
          }

        </div>
      </div>
      <div className='footer'>
        <div className='external-link' onClick={() => openExternalLink('https://github.com/chriswhong/electron-nest-cam-viewer')}>
          <FontAwesomeIcon data-tip="View Project on Github" icon={faGithub} />
        </div>
      </div>
      <ReactTooltip place="bottom" type="dark" effect="solid"/>
    </div>
  )
}

export default App
