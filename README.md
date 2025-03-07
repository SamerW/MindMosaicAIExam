
<p align="center">
  <img src="mindmosaic_logo" alt="Project Logo" width="150">
</p>

<h1 align="center">MindMosaicAIExam</h1>

<p align="center">
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT">
  </a>
</p>


MindMosaic AI Exam System allows to extract thinking artefacts from students as they are using AI tools such as LLMs to answer their exam questions

The plateform is built over 4 components:
- A Mongo database for exam information, analytics and HTTP sessions.
- A Redis database to manage websocket data exchange and server scheduled tasks.
- An application server developped in Python using Flask API framework that allows multiple Chat bot integration. This application is designed to be used being a reverse proxy.
- A front web application developped in React and MobX.

The architecture is designed to be easily deployed with docker compose.

This file explains two ways to deploy the plateform and give an example of an installation and integration of Dalai (LLaMA and Alpaca LLM service).
- With [the full docker deployment](#full_docker_deployment), each component is handled by a dedicated docker container, such as a proxy server. This strategy is mainly for testing or developpement
- With a [self-hosted reverse proxy](#self-hosted_reverse_proxy), each component is handled by a dedicated container, with the application configured to be accessed from the host reverse-proxy server. This strategy is mainly for a production use

If you start from scratch and you just want to test the plateform on your machine, follow the steps 1 to 9 of the section [Dalai docker hosting](#dalai-docker-hosting) then follow the section [Docker full hosting](#full_docker_deployment).

# Automated installation on MacOS
If you prefer an automated installation on MacOS, you can run the script InstallExamMacOS.sh in you terminal and follow the provided instructions. You can use the same script to add Ollama models

# Full docker deployment

In this setting, docker will manage all components of the system: the database, the redis server, the application server itself, the http proxy, and the web application building service

## Prerequisite

- Docker with Docker compose V2

## Setup

### Server and containers configuration

If you want to let user saccess the system from outside your machine, you need to allow outside connection to the proxy container. Edit the file `docker-compose.yml` to change the line 55 from "- 127.0.0.1:8888:80" to "- 8888:80". The system will be available to the port 8888 of your machine from outside (you can also change this port to your will)

You may want to edit the file `isourceit-server/config.py` to adapt the configuration. Especially :
- APP_COMPOSITION_AUTH_GENERATION_URL and APP_COMPOSITION_AUTH_VALIDATION_URL to change the hostname/port of your machine if you want the server to be accessible from outside you machine
- The Mail configuration to set your smtp server to allow the system sending mails to students
- The Chat AI integration configuration to enable/disable the different integrations of Chat AI and configure them


### Front (webapp) compilation

Just execute the following command to run the build process of the web application
```
docker compose --profile front-builder run --rm npm
```

Once done, building statistics can be found in `isourceit-app/build_stats`. The build output itself will be found in `isourceit-app/build`.

### Container building and running

For the first time, build the containers:

```
docker compose --profile server --profile proxy build
```

To start the services:

```
docker compose --profile server --profile proxy up -d
```

You can then access the merged logs of the different services (^C to quit)

```
docker compose --profile server --profile proxy logs -f
```

To stop the services:

```
docker compose --profile server --profile proxy down
```

# Self-hosted reverse proxy

In the production server, the reverse proxy is usually installed on the host machine itself.

In this setting, docker will manage the other components of the system: the database, the redis server, the application server itself, and the web application building service.

In these settings, you may also want to change the root path of the application that will be used by the reverse proxy to redirect requests to the python server (by default '/isourceit').

## Prerequisite

- Docker with Docker compose V2
- An HTTP server (e.g.: Apache httpd, nginx) configured for reverse proxying

## Setup

### Web application Server and containers configuration

To change the root path of the application :

- change the configuration of your reverse proxy accordingly (an example for Apache httpd can be found in `examples/reverseProxy/proxy-httpd.conf`)
- edit the file `isourceit-app/webpack.prod.js` and update variables PUBLIC_PATH (l.13), RESOURCES_PATH (l.14), API_BASE_URL (l.15) and WEBSOCKET_PATH_URL (l.17) with the root path of your choice
- Edit the file `docker-compose.yml`, uncomment the lines 43 and 44, and adapt the exposed local port accordingly to your reverse proxy settings. 
- Edit the file `isourceit-server/config.py` to adapt the configuration. Especially :
  - APP_COMPOSITION_AUTH_GENERATION_URL and APP_COMPOSITION_AUTH_VALIDATION_URL to change the hostname, port and root path of your machine.
  - The Mail configuration to set your smtp server to allow the system sending mails to students
  - The Chat AI integration configuration to enable/disable the different integrations of Chat AI and configure them

### Front (webapp) compilation

Just execute the following command to run the build process of the web application

```
docker compose --profile front-builder run --rm npm
```

Once done, building statistics can be found in `isourceit-app/build_stats`. The build output itself will be found in `isourceit-app/build`.

### Container building and running

For the first time, build the containers:

```
docker compose --profile server build
```

To start the services:

```
docker compose --profile server up -d
```

You can then access the merged logs of the different services (^C to quit)

```
docker compose --profile server logs -f
```

To stop the services:

```
docker compose --profile server down
```

# Dalai docker hosting

If you want to install Dalai on the same machine than the application and integrate it, the can follow the next steps :

1. clone the dalai repository (may be outside this project folder): `git clone https://github.com/cocktailpeanut/dalai.git`
2. build the application: `docker compose build`
3. install the models of your choice. For instance: `docker compose run dalai npx dalai alpaca install 7B`
4. replace the `docker-compose.yml` file of the dalai project with the file `examples/dalaiDockerIntegration/docker-compose.yml` of this project
5. start the dalai server: `docker compose up -d`
6. go to the isourceit folder project
7. Stop the isourceit services if required (docker compose ... down)
8. Update the `docker-compose.yml` file of the isourceit project and uncomment lines 47, 75 and 76, relative to the dalai network
9. Enable dalail integration in `isourceit-server/config.py`  using the url "http://dalai-server:3000" 
10. (Re)start the isourceit services according to your achitecture settings (docker compose ... up -d)

# First step after deployment

One the plateform is deployed, you can create local users (teacher or admin) using the following command:

```
docker compose --profile server exec server python create-user.py [-a] [--config container_config_path] -p password username
```

With :
- __-a__ admin flag (user will be a teacher otherwise)
- __--config container_config_path__ the config file path within the docker container (by default config.py at the root of the application server project)
- __-p password__ the user's password
- __username__ the username

# Contirbutors
- Ahmad Samer Wazan, Zayed University
- Anis Bey
- Rémi Venant, LeMans University
- Imran Taj, Zayed University



