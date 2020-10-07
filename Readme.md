- Node.js takes request, runs popengine and gets png/jpeg output
  - Spin up exe every time, load shaders etc

- Run popengine in docker image with http server
  - Missed requests during spin up
  - possible bottleneck http requests
  
- Run node.js, IPC to popengine app
  - More complex, still bottlenecks?
