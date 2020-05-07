import React, { useState, useEffect } from 'react'
import ReactTooltip from 'react-tooltip'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVideo, faTrash, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons'

import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'

const { ipc } = window

function App () {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [validatingCamera, setValidatingCamera] = useState(false)
  const [cameras, setCameras] = useState([])

  const fetchCameras = () => {
    setCameras(ipc.sendSync('fetch-cameras'))
  }

  const validateCamera = e => {
    e.preventDefault()
    setValidatingCamera(true)
    setError('')
    ipc.send('validate-camera', {
      id,
      password
    })
  }

  const openCamera = (id) => {
    ipc.send('open-camera', id)
  }

  const removeCamera = (id) => {
    setCameras(ipc.sendSync('remove-camera', id))
  }

  const showCamera = (id) => {
    ipc.send('show-camera', id)
  }

  useEffect(() => {
    fetchCameras()
    ipc.on('validate-camera-response', (event, response) => {
      setValidatingCamera(false)

      const { status, message } = response
      if (status === 'error') {
        setError(message)
      } else {
        setError('')
        setId('')
        setPassword('')
        fetchCameras()
      }
    })
  }, [])

  useEffect(() => {
    ReactTooltip.rebuild()
  }, [cameras])

  const camerasList = cameras.map(({ id, name }) => {
    return (
      <div className='camera-list-item' key={id} onClick={() => { showCamera(id) }}>
        <div className='camera-name'>{name}</div>
        <div className='camera-button' data-tip='Pop-out Camera' onClick={() => { openCamera(id) }}><FontAwesomeIcon icon={faExternalLinkAlt} /></div>
        <div className='camera-button' data-tip='Delete Camera' onClick={() => { removeCamera(id) }}><FontAwesomeIcon icon={faTrash} /></div>
      </div>
    )
  })

  return (
    <div className="App">
      <div className='header-container'>
        <h1 className="title"><FontAwesomeIcon icon={faVideo} /> Cam View</h1>
        <p>A Desktop Viewer for Nest Cams</p>
      </div>
      <div className='camera-list-container'>
        <h5>Cameras</h5>
        <ul>
          {camerasList}
        </ul>
      </div>
      <hr/>
      <div className='add-camera-container'>
        <h4>Add a Camera</h4>
        <input type="text" id="cam-id" name="cam-id" placeholder="xxXxXXXxxx" value={id} onChange={e => setId(e.target.value)} />
        <input type="password" id="password" name="password" placeholder="password" value={password} onChange={e => setPassword(e.target.value)}/>
        {
          validatingCamera && (
            <div>...</div>
          )
        }
        {
          !validatingCamera && (
            <button onClick={validateCamera}>Add</button>
          )
        }
        <p>{error}</p>
      </div>
      <ReactTooltip place="bottom" type="dark" effect="solid"/>
    </div>
  )
}

export default App
