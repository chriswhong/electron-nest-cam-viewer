const { app, screen, BrowserWindow, BrowserView, ipcMain } = require('electron')
const path = require('path')
const isDev = require('electron-is-dev')
const fetch = require('node-fetch')
const Store = require('electron-store')
const keytar = require('keytar')

const store = new Store()

const popOuts = {}

let mainWindow
let cameraBrowserView

const SERVICE_NAME = 'cam-view'
const WIDTH = 350
const HEIGHT = 560

let saveBoundsCookie

const saveBoundsSoon = (window) => {
  if (saveBoundsCookie) clearTimeout(saveBoundsCookie)
  saveBoundsCookie = setTimeout(() => {
    saveBoundsCookie = undefined

    if (window === 'mainWindow') {
      const bounds = mainWindow.getNormalBounds()
      store.set('mainWindow', { bounds })
    } else {
      const bounds = popOuts[window].getNormalBounds()
      const cameras = store.get('cameras')
      const thisCamera = cameras.find(d => d.id === window)
      thisCamera.bounds = bounds
      store.set('cameras', cameras)
    }
  }, 1000)
}

// opens a new camera in a browserWindow (pop-out)
const popoutCamera = (id, password, screenX, screenY) => {
  let width = WIDTH
  let height = parseInt(WIDTH * 0.56) + 22
  let x = screenX + 20
  let y = screenY - (height / 2)

  // if bounds exist in the store, open in previous position and size
  const { bounds } = store.get('cameras').find(d => d.id === id)

  if (bounds) {
    width = bounds.width
    height = bounds.height
    x = bounds.x
    y = bounds.y
  }

  popOuts[id] = new BrowserWindow({
    width,
    height,
    x,
    y
  })
  // load the nest cam sharing page
  popOuts[id].loadURL(`https://video.nest.com/live/${id}?autoplay=1`)

  // keep a fixed aspect ratio when the window is resized (MacOS only)
  popOuts[id].setAspectRatio(16 / 9)

  // make the window stay on top
  popOuts[id].setAlwaysOnTop(true, 'floating', 1)
  // even if other apps are full screen
  popOuts[id].setVisibleOnAllWorkspaces(true)

  popOuts[id].webContents.on('did-finish-load', () => {
    // override the CSS to make the video fill the viewport
    // also ignore clicks on the video area (disable pausing)
    popOuts[id].webContents.insertCSS(`
      header, #details, #meet-nest-cam, footer, .vjs-live-label, .vjs-big-play-button {
        display: none !important;
      }
      #video {
        margin-bottom: 0 !important;
      }
      .vjs-tech {
        pointer-events: none;
      }
    `)

    // fill in the password input and submit the form
    // poll every second to see if the camera has timed out
    popOuts[id].webContents.executeJavaScript(`
      $(".secure-password-input").first().val("${password}"); $("#secure-password-form").submit()
      setInterval(() => {
        if ($('.end-state-wrapper:visible').length) {
          ipc.send('camera-stopped', '${id}')
        }
      }, 1000)
    `)

    popOuts[id].on('resize', () => { saveBoundsSoon(id) })
    popOuts[id].on('move', () => { saveBoundsSoon(id) })

    popOuts[id].on('close', (event) => {
      popOuts[id] = null
    })
  })
}

// checks to see if the password is valid for the camera by opening
// a browserWindow, filling out the password inout, and checking the page
// for an 'error' class
const checkPassword = (id, password = '') => {
  let error = null
  ipcMain.on('password-error', (event, message) => {
    error = message
  })

  return new Promise((resolve, reject) => {
    // open a BrowserWindow with no dimensions and no frame
    const camWindow = new BrowserWindow({
      width: 0,
      height: 0,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js')
      },
      frame: false
    })
    // load the nest cam sharing page
    camWindow.loadURL(`https://video.nest.com/live/${id}?autoplay=1`)

    camWindow.webContents.on('did-finish-load', () => {
      // fill in the password input and submit the form
      // wait 3 seconds, then check the page for an 'error' class
      camWindow.webContents.executeJavaScript(`
        $(".secure-password-input").first().val("${password}"); $("#secure-password-form").submit()
        setTimeout(() => {
          const passwordError = $('.message').hasClass('error')
          ipc.send('password-error', passwordError);
        }, 3000)
      `)

      // wait 3.25 seconds, make sure error has been set, resolve it
      // if error is null, something went wrong with validation
      setTimeout(() => {
        const name = camWindow.getTitle().split(' |')[0]
        camWindow.destroy()
        ipcMain.removeHandler('password-error')
        if (error === null) {
          reject(new Error('something went wrong with validation'))
        } else {
          resolve({
            name,
            error
          })
        }
      }, 3250)
    })
  })
}

// opens a new camera in a browserView (main window viewer)
const showCamera = (id, password) => {
  cameraBrowserView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  mainWindow.setBrowserView(cameraBrowserView)
  const VIEWHEIGHT = 196
  cameraBrowserView.setBounds({ x: 0, y: 22, width: WIDTH, height: VIEWHEIGHT })
  // load the nest cam sharing page
  cameraBrowserView.webContents.loadURL(`https://video.nest.com/live/${id}?autoplay=1`)

  cameraBrowserView.webContents.on('did-finish-load', () => {
    // override the CSS to make the video fill the viewport
    // also ignore clicks on the video area (disable pausing)
    cameraBrowserView.webContents.insertCSS(`
      header, #details, #meet-nest-cam, footer, .vjs-live-label, .vjs-big-play-button {
        display: none !important;
      }
      #video {
        margin-bottom: 0 !important;
      }
      .vjs-tech {
        pointer-events: none;
      }
    `)

    // fill in the password input and submit the form
    // poll every second to see if the camera has timed out
    cameraBrowserView.webContents.executeJavaScript(`
      $(".secure-password-input").first().val("${password}"); $("#secure-password-form").submit()
      setInterval(() => {
        if ($('.end-state-wrapper:visible').length) {
          ipc.send('camera-stopped', 'main-window')
        }
      }, 1000)
    `)
  })
}

// add a new camera to the datastore
const addCamera = (id, password, name) => {
  let cameras = store.get('cameras')
  if (cameras) {
    cameras.push({ id, name })
  } else {
    cameras = [{ id, name }]
  }

  // store password in keytar
  if (password) {
    keytar.setPassword(SERVICE_NAME, id, password)
  }

  store.set('cameras', cameras)
}

// show the settings screen
const loadMainWindow = () => {
  // Create the browser window.
  const bounds = store.get('mainWindow.bounds')
  const options = {
    width: WIDTH,
    height: HEIGHT,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hidden',
    resizable: false
  }

  // from https://github.com/electron/electron/issues/526#issuecomment-563010533
  if (bounds) {
    const area = screen.getDisplayMatching(bounds).workArea
    // If the saved position still valid (the window is entirely inside the display area), use it.
    if (
      bounds.x >= area.x &&
      bounds.y >= area.y &&
      bounds.x + bounds.width <= area.x + area.width &&
      bounds.y + bounds.height <= area.y + area.height
    ) {
      options.x = bounds.x
      options.y = bounds.y
    }
    // If the saved size is still valid, use it.
    if (bounds.width <= area.width || bounds.height <= area.height) {
      options.width = bounds.width
      options.height = bounds.height
    }
  }

  mainWindow = new BrowserWindow(options)

  mainWindow.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`)

  if (isDev) {
    // Open the DevTools.
    // BrowserWindow.addDevToolsExtension('<location to your react chrome extension>');
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('close', (event) => {
    if (app.quitting) {
      mainWindow = null
    } else {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('resize', () => { saveBoundsSoon('mainWindow') })
  mainWindow.on('move', () => { saveBoundsSoon('mainWindow') })
}

// fetch the cameras list from the store
ipcMain.on('fetch-cameras', (event) => {
  const cameras = store.get('cameras')
  event.returnValue = cameras || []
})

// pop out a camera window
ipcMain.on('popout-camera', async (event, id, screenX, screenY) => {
  // find camera in list
  const password = await keytar.getPassword(SERVICE_NAME, id)
  popoutCamera(id, password, screenX, screenY)
})

// remove camera from store
ipcMain.on('remove-camera', (event, id) => {
  // find camera in list
  let cameras = store.get('cameras')
  cameras = cameras.filter(d => d.id !== id)
  store.set('cameras', cameras)

  // remove stored password
  keytar.deletePassword(SERVICE_NAME, id)
  event.returnValue = cameras || []
})

// load camera in the main window
ipcMain.on('show-camera', async (event, id) => {
  // find camera in list
  const password = await keytar.getPassword(SERVICE_NAME, id)
  showCamera(id, password)
  event.returnValue = id
})

ipcMain.on('hide-camera', (event, id) => {
  // remove the browserView if it exists
  if (mainWindow.getBrowserView()) {
    mainWindow.setBrowserView(null)
    cameraBrowserView.destroy()
  }
  event.returnValue = ''
})

// reload cameras when they timeout
ipcMain.on('camera-stopped', (event, value) => {
  console.log('camera-stopped', value)
  // handle main-window stopped
  if (value === 'main-window') {
    cameraBrowserView.webContents.reload()
  } else {
    popOuts[value].webContents.reload()
  }
})

// validate the id and password combination
ipcMain.on('validate-camera', async (event, { id, password }) => {
  const cameraURL = `https://video.nest.com/live/${id}`

  try {
    const html = await fetch(cameraURL).then(d => d.text())

    // first make sure it's actuall a camera id
    if (html.includes('not-found')) {
      event.sender.send('validate-camera-response', {
        status: 'error',
        message: 'invalid camera url'
      })
      return
    }

    // next check to see if it requires a password
    if (html.includes('Password Protected Live Stream')) {
      // if password is blank, respond with message asking for one
      if (password === '') {
        event.sender.send('validate-camera-response', {
          status: 'error',
          message: 'password-protected'
        })
      } else {
        // now see if the password is valid
        const { name, error: passwordError } = await checkPassword(id, password)
        if (passwordError) {
          event.sender.send('validate-camera-response', {
            status: 'error',
            message: 'invalid password'
          })
        } else {
          addCamera(id, password, name)
          event.sender.send('validate-camera-response', {
            status: 'success',
            message: id
          })
        }
      }
    } else {
      // otherwise, this is a public camera page
      const { name } = await checkPassword(id)

      addCamera(id, password, name)
      event.sender.send('validate-camera-response', {
        status: 'success',
        message: id
      })
    }
  } catch (e) {
    console.error('error', e)
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // load the main window
  loadMainWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// called when the dock icon is clicked
app.on('activate', () => {
  // open the main window
  mainWindow.show()
})

app.on('before-quit', () => {
  app.quitting = true
})
