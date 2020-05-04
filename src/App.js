import React, { useState, useEffect } from 'react'
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

  const camerasList = cameras.map(({ id }) => {
    return (<li key={id} onClick={() => { openCamera(id) }}>{id}</li>)
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
        <input type="text" id="cam-id" name="cam-id" placeholder="xxXxXXXxxx" onChange={e => setId(e.target.value)} />
        <input type="password" id="password" name="password" placeholder="password" onChange={e => setPassword(e.target.value)}/>
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
