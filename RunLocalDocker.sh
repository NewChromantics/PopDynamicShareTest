#!/bin/bash

echo "Building docker image"
docker build --tag popenginetest_docker_linux .

# This will run the app interactively (to make sure its going in a shell) and then when you close the shell it will remove the docker image
# Make sure to run the docker build before hand and change the mounted volumes

# gr: path must be absolute
# -it interactive tty
echo "run docker image"
#gr need
#	--device=/dev/<device>/dev/<device> to forward a device to container
#	try /dev/dri
#https://github.com/GoogleCloudPlatform/container-engine-accelerators/tree/master/cmd/nvidia_gpu
docker run --publish 8001:80 --env FailOnExitCode=true -t --rm popenginetest_docker_linux 
