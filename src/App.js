import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVideo, faTrash } from '@fortawesome/free-solid-svg-icons'

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

  const camerasList = cameras.map(({ id, name }) => {
    return (
      <div className='camera-list-item' key={id}>
        <div className='camera-name'>{name}</div>
        <div className='camera-button' onClick={() => { openCamera(id) }}><FontAwesomeIcon icon={faVideo} /></div>
        <div className='camera-button' onClick={() => { removeCamera(id) }}><FontAwesomeIcon icon={faTrash} /></div>
      </div>
    )
  })

  return (
    <div className="App">
      <div className='header-container'>
        <h2 className="title">Cam View</h2>
        <p>A Desktop Viewer for Nest Cams</p>
      </div>
      <hr/>
      <div className='camera-list-container'>
        <h4>Cameras</h4>
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
    </div>
  )
}

export default App
