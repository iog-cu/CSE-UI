[Back to Main](../README.md)

# Extracting Manifests

The game client ships with static data used by the UI to populate strings and build tooltips among other jobs. This data is stored in our spud file archives and retrieved at runtime by our custom resource manager. To make systems easier to debug and enable third party access to our data, we have added a new command line switch to the client that dumps the current manifests to disk as json files.

Running the client with the command line option `manifestExportDirectory=<location on your drive>` will place all of the current builds' manifest files with the following naming convention: `<location on your drive>/<channel#>/<name>[<build>].manifest.json`

Both the steam client and the launcher client support this option. In steam, you can modify the command line by following these directions: https://help.steampowered.com/en/faqs/view/7D01-D2DD-D75E-2955. To modify the command line from the UCE launcher, you can hold down the ALT key when you press play and add parameters to the pop-up box.
