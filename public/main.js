const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const isDev = require('electron-is-dev')
const fetch = require('node-fetch')
const Store = require('electron-store')

const store = new Store()

// opens a new camera in a browserWindow
const openCamera = ({ id, password }) => {
  const camWindow = new BrowserWindow({
    width: 508,
    height: 306
  })
  // load the nest cam sharing page
  camWindow.loadURL(`https://video.nest.com/live/${id}?autoplay=1`)

  // keep a fixed aspect ratio when the window is resized (MacOS only)
  camWindow.setAspectRatio(16 / 9)

  // make the window stay on top
  camWindow.setAlwaysOnTop(true, 'floating', 1)
  // even if other apps are full screen
  camWindow.setVisibleOnAllWorkspaces(true)

  camWindow.webContents.on('did-finish-load', () => {
    // override the CSS to make the video fill the viewport
    // also ignore clicks on the video area (disable pausing)
    camWindow.webContents.insertCSS(`
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
    camWindow.webContents.executeJavaScript(`
      $(".secure-password-input").first().val("${password}"); $("#secure-password-form").submit()
    `)
  })
}

// checks to see if the password is valid for the camera by opening
// a browserWindow, filling out the password inout, and checking the page
// for an 'error' class
const checkPassword = (id, password) => {
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
        camWindow.destroy()
        ipcMain.removeHandler('password-error')
        if (error === null) {
          reject(new Error('something went wrong with validation'))
        } else {
          resolve(error)
        }
      }, 3250)
    })
  })
}

// add the camera to the datastore
const addCamera = (camera) => {
  const cameras = store.get('cameras')
  cameras.push(camera)
  store.set('cameras', cameras)
}

// show the settings screen
const showSettings = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: isDev ? 600 : 300,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`)

  if (isDev) {
    // Open the DevTools.
    // BrowserWindow.addDevToolsExtension('<location to your react chrome extension>');
    mainWindow.webContents.openDevTools()
  }
}

// fetch the cameras list from the store
ipcMain.on('fetch-cameras', (event) => {
  event.returnValue = store.get('cameras')
})

// open a camera window
ipcMain.on('open-camera', (event, id) => {
  // find camera in list
  const credentials = store.get('cameras').find(d => d.id === id)
  openCamera(credentials)
})

// validate the id and password combination
ipcMain.on('validate-camera', async (event, { id, password }) => {
  console.log('validating', id, password)
  const cameraURL = `https://video.nest.com/live/${id}`

  try {
    const html = await fetch(cameraURL).then(d => d.text())

    // first make sure it's valid
    if (html.includes('not-found')) {
      event.sender.send('validate-camera-response', {
        status: 'error',
        message: `${id} does not seem to be a valid camera id`
      })
    }

    // next check to see if it requires a password

    if (html.includes('Password Protected Live Stream')) {
      // if password is blank, respond with message asking for one
      if (password === '') {
        event.sender.send('validate-camera-response', {
          status: 'error',
          message: `the camera ${id} requires a password`
        })
      } else {
        // now see if the password is valid
        console.log('checking password', id, password)
        const passwordError = await checkPassword(id, password)
        console.log('passwordError', passwordError)
        if (passwordError) {
          event.sender.send('validate-camera-response', {
            status: 'error',
            message: 'invalid password'
          })
        } else {
          addCamera({
            id,
            password
          })
          event.sender.send('validate-camera-response', {
            status: 'success',
            message: 'success'
          })
        }
      }
    } else {
      // otherwise, this is a public camera page
      addCamera({
        id,
        password
      })
      return {
        status: 'success',
        message: 'success'
      }
    }
  } catch (e) {
    console.log('error', e)
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  showSettings()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// called when the dock icon is clicked
app.on('activate', () => {
})
