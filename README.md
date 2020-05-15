# electron-nest-cam-viewer

An electron app for showing a nest camera public or password-protected sharing page in a floating window.

Available for MacOS [Download v0.0.1]

## Contributing

This is an open source project I started so I could have a better experience viewing my nest cams.  I'd love contributions and bugfixes if you would like to help out.  Check the issues to see what needs work.

## Local Development

- Clone this repo
- Install dependencies: `yarn`
- Start the dev server: `yarn dev`

You will see a settings page where you can enter your camera id and password.  The camera id is a string of upper and lower case letters and can be found in the shared camera url: `https://video.nest.com/live/{camera-id}`

The program will check to see if your camera id and password are valid, and will add the camera to the cameras list.  You can open a viewer window by clicking the camera id in the list.

## How it Works

The electron app is simply a different presentation of the existing nest cam sharing pages.  When you enable sharing (with or without password), the feed is available at https://video.nest.com/live/{camera-id}.  This app is simply loading these shared camera URLs in smaller windows (using electron's `BrowserView` and `BrowserWindow` features.  It also persists the user's camera list, persists passwords for password-protected cameras,  and provides a pop-out view for cameras that always stays on top in MacOS.
