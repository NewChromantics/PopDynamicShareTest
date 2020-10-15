PopImageServer
=======================
This [test] project generates a docker image, which creates [.png] images on the fly from a node.js server.
It invokes a PopEngine app which takes args to generate an image with opengl and send it back to the response.

Designed specifically to serve dynamic meta images in websites which are facebook & twitter compatible.


Implementation notes
======================
https://cloud.google.com/run/docs/developing

`Your code should check for the existence of this PORT environment variable and if it is present, should listen on it to maximize portability.`

`The service must not perform background activities outside the scope of request handling.`
  - Discounts option 3
  
`If you bring your own binaries, make sure they are compiled for Linux ABI x86_64.`
