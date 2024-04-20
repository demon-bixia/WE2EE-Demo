# syntax=docker/dockerfile:1
FROM node

# create the working directory in the container.
WORKDIR /app/client

# copy package.json and package-lock.json to make use of cached Docker layers.
COPY package.json /app/client

# install server depenencies.
RUN npm install

# copy everthing from this folder to the container's /code folder.
COPY . /app/client/