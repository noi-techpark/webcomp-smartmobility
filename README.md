Webcomponent - Smart Mobility
============================

Webcomponents meant for displaying different mobility layers which currently are also shown on  http://mobility.meran.eu

[![CI](https://github.com/noi-techpark/webcomp-smartmobility/actions/workflows/ci.yml/badge.svg)](https://github.com/noi-techpark/webcomp-smartmobility/actions/workflows/ci.yml)

## Quickstart

You can download the packaged/build components and include them in your website or link the resources directly by means of a CDN (e.g. [jsDelivr](https://www.jsdelivr.com/?docs=gh)) service.

    <!-- include self-hosted component -->
    <script src="./smartmobility.min.js"></script>

    <!-- include from CDN -->
    <script src="https://cdn.jsdelivr.net/gh/noi-techpark/webcomp-smartmobility@master/dist/smartmobility.min.js"></script>

Once the component is correctly included, the following custom tag can be used

    <smart-mobility endpoint="https://[SERVER]"></smart-mobility>
    
### Attributes

#### endpoint

Valid base url to the server providing the required API. This attribute is required.

#### routes

Regular expression that will filter the routes that the webcomponent will consider and display. This attribute is not required.

The following shows all routes for the city of Bozen-Bolzano:

    routes="^.* BZ$"

## Development

All relevant files can be found in the `src` folder.

### Requirements

* Node
* NPM
* Yarn

### Setup

Download and install all necessary dependencies. Requires the `yarn` command/tool installed at the system level.

    yarn

### Build

Build a minified file/asset in the `dist` folder.

    yarn build

### Developing

Starts watching the source files and recompiles them if necessary. Provides website at `http://0.0.0.0:8080` that reloads itself automatically.

    yarn watch
