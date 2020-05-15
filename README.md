# electron-nest-cam-viewer

An electron app for showing a nest camera public or password-protected sharing page in a floating window.

Available for MacOS [Download v0.0.1](https://github.com/chriswhong/electron-nest-cam-viewer/releases/download/v0.0.1/Cam.View-0.0.1.dmg)

<img width="462" alt="Screen Shot 2020-05-14 at 11 13 24 PM" src="https://user-images.githubusercontent.com/1833820/82008373-82814180-963a-11ea-9049-2e8a56a94e46.png"><img width="462" alt="Screen Shot 2020-05-14 at 11 29 11 PM" src="https://user-images.githubusercontent.com/1833820/82008484-d724bc80-963a-11ea-9222-3e9338c737dd.png">

## How to Use

Get the sharing url for a Nest Cam. It looks like `https://video.nest.com/live/xXXxxXxXXx` This can be set up in your camera's settings, where you can share it publicly or with a password.  Either will work with Cam View.  (There are also a lot of publicly available nest cams of things like birds nests and doggy daycares that you can find with a google search)

Next, launch Cam View, click '+ Add Camera', and paste in the sharing URL.  If it's public, Cam View will show it in the main window and add it to your Cameras list.  If it requires a password, it will prompt you for the password.  (The password is stored securely in MacOS' keychain)

### Pop-out Cameras

You can pop-out a camera into its own window, which will always remain "on top".  I like to put these in the corner of my display while I am working.

### Remove Cameras

Each camera on the list can be removed by clicking the trashcan icon.

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
