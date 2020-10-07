Implementation Options
============================
1. Node.js takes request, runs popengine and gets png/jpeg output
  - Spin up exe every time, load shaders etc

2. Run popengine in docker image with http server
  - Missed requests during spin up
  - possible bottleneck http requests
  
3. Run node.js, IPC to popengine app
  - More complex, still bottlenecks?


Implementation notes
======================
https://cloud.google.com/run/docs/developing

`Your code should check for the existence of this PORT environment variable and if it is present, should listen on it to maximize portability.`

`The service must not perform background activities outside the scope of request handling.`
  - Discounts option 3
  
`If you bring your own binaries, make sure they are compiled for Linux ABI x86_64.`
