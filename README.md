# electron-nest-cam-viewer

An electron app for showing a nest camera public or password-protected sharing page in a floating window.

## Experimental

This is an experimental project and currently stores passwords in an insecure manner.  Use at your own risk.

## How to Use

- Clone this repo
- Install dependencies: `yarn`
- Start the dev server: `yarn dev`

You will see a settings page where you can enter your camera id and password.  The camera id is a string of upper and lower case letters and can be found in the shared camera url: `https://video.nest.com/live/{camera-id}`

The program will check to see if your camera id and password are valid, and will add the camera to the cameras list.  You can open a viewer window by clicking the camera id in the list.
