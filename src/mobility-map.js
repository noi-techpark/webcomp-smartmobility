import { LitElement, html } from 'lit-element';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-dialog/paper-dialog.js';

import _ from 'lodash';
import OLMap from 'ol/Map';
import OLView from 'ol/View';
import OLExtent from 'ol/interaction/Extent';
import * as OLExtentUtils from 'ol/extent';
import OLLayerGroup from 'ol/layer/Group';
import OLTileLayer from 'ol/layer/Tile';
import OLXYZ from 'ol/source/XYZ';
import OLVectorLayer from 'ol/layer/Vector';
import OLVectorSource from 'ol/source/Vector';
import OLGeoJSON from 'ol/format/GeoJSON';
import OLOSM from 'ol/source/OSM';
import { fromLonLat as OLProjectionFromLonLat } from 'ol/proj';
import OLFeature from 'ol/Feature';
import OLPoint from 'ol/geom/Point';
import OLProjection from 'ol/proj/Projection';
import { Circle as OLCircleStyle, Fill as OLFill, Stroke as OLStroke, Icon as OLIcon, Style as OLStyle } from 'ol/style';
import OLGeolocation from 'ol/Geolocation';
import OLSelect from 'ol/interaction/Select';
import { click as OLClickCondition } from 'ol/events/condition';

import assets__bus_icon from './assets/bus.svg';
import assets__close_icon from './assets/close.svg';
import assets__fit_icon from './assets/fit.svg';
import assets__layers_icon from './assets/layers.svg';
import assets__settings_icon from './assets/settings.svg';
import assets__track_icon from './assets/track.svg';
import assets__zoom_in_icon from './assets/zoom-in.svg';
import assets__zoom_out_icon from './assets/zoom-out.svg';

class MobilityMap extends LitElement {

  constructor() {
    super()

    this.endpoint = 'http://0.0.0.0'
    this.lines = '.*'

    this.services = []
    this.routes = {}
    this.enabledRoutes = {}
  }

  static get properties() {
    return {
      endpoint: {attribute: 'endpoint', type: String},
      lines: {attribute: 'lines', type: String},
    }
  }

  render() {
    return html`
      <style>
        @import url('https://fonts.googleapis.com/css?family=Open+Sans');

        #contains-map {
          height: 100%;
          position: relative;
          width: 100%;
        }

        #contains-map .map-control {
          background: #ffffff;
          border: 1px solid #f8f8f8;
          box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 3px 0 rgba(0, 0, 0, 0.12), 0 2px 1px -2px rgba(0, 0, 0, 0.2);
          box-sizing: border-box;
          cursor: pointer;
          display: block;
          height: 48px;
          padding: 8px;
          transition: all 0.2s ease-in-out;
          width: 48px;
        }

        #contains-map .map-control:hover {
          background: #f5f5f5;
        }

        #contains-map .map-control img {
          max-width: 100%;
          width: 100%;
        }

        #contains-map #map-top-controls {
          position: absolute;
          right: 1em;
          top: 1em;
          z-index: 200;
        }

        #contains-map #map-top-controls .map-control {
          margin-bottom: 1em;
        }

        #contains-map #map-bottom-controls {
          position: absolute;
          right: 1em;
          bottom: 1em;
          z-index: 200;
        }

        #contains-map #map-bottom-controls .map-control {
          margin-top: 1em;
        }

        #contains-map #track {

        }

        #contains-map #track.is-active {

        }

        #contains-map #track.is-active svg path {
          fill: #0077ff;
        }

        #contains-map #map {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 100;
        }

        #dialog {
          overflow: auto;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          margin: 16px;
          width: 400px;
        }

        #dialog .dialog-header {
          margin: 0;
          overflow: auto;
          padding: 16px 16px 8px 24px;
        }

        #dialog .dialog-header h2 {
          float: left;
          font-size: 1.8em;
          line-height: 48px;
          margin: 0 48px 0 0;
        }

        #dialog .dialog-header #close-dialog {
          box-sizing: border-box;
          display: block;
          float: right;
          height: 48px;
          margin: 0;
          padding: 0;
          width: 48px;
        }

        #dialog .dialog-header #close-dialog img {
          max-width: 100%;
          width: 100%;
        }

        #dialog .map-settings .contains-selection-links {
          padding: 16px 0;
        }

        #dialog .map-settings .contains-selection-links a {
          color: #333333;
          display: inline-block;
          font-size: 1.5em;
          margin: 0 16px 0 0;
          text-decoration: none;
        }

        #dialog .map-settings .contains-selection-links a:hover {
          text-decoration: underline;
        }

        #dialog .map-settings .contains-route-checkboxes {
          margin-left: -4px;
          margin-right: -4px;
        }

        #dialog .map-settings .contains-route-checkbox {
          box-sizing: border-box;
          cursor: pointer;
          display: inline-block;
          padding: 4px;
          width: 25%;
        }

        #dialog .map-settings .contains-route-checkbox .wrapper {
          height: 32px;
          position: relative;
        }

        #dialog .map-settings .contains-route-checkbox span {
          color: #ffffff;
          font-size: 1.5em;
          font-weight: bold;
          line-height: 30px;
          padding: 0 8px;
          pointer-events: none;
        }

        #dialog .map-settings .contains-route-checkbox paper-checkbox {
          --paper-checkbox-unchecked-background-color: #ffffff;
          --paper-checkbox-unchecked-color: #ffffff;
          --paper-checkbox-checked-color: #ffffff;
          position: absolute;
          right: 0;
          top: 7px;
        }

        #dialog table {
          width: 100%;
        }
      </style>
      <div id="contains-map">

        <div id="map-top-controls">
          <a href="#" id="zoom-in" class="map-control">
            ${unsafeHTML(assets__zoom_in_icon)}
          </a>

          <a href="#" id="zoom-out" class="map-control">
            ${unsafeHTML(assets__zoom_out_icon)}
          </a>

          <a href="#" id="fit" class="map-control">
            ${unsafeHTML(assets__fit_icon)}
          </a>

          <a href="#" id="layers" class="map-control">
            ${unsafeHTML(assets__layers_icon)}
          </a>
        </div>

        <div id="map-bottom-controls">
          <a href="#" id="settings" class="map-control">
            ${unsafeHTML(assets__settings_icon)}
          </a>

          <a href="#" id="track" class="map-control">
            ${unsafeHTML(assets__track_icon)}
          </a>
        </div>

        <div id="map"></div>

        <paper-dialog id="dialog">
          <div class="dialog-header">
            <a href="#" id="close-dialog">
              <img src="data:image/svg+xml;base64,${btoa(assets__close_icon)}"/>
            </a>
            <h2 id="dialog-title"></h2>
          </div>
          <div id="dialog-contents"></div>
        </paper-dialog>
      </div>
    `;
  }

  buildExtent(extent, layers) {
    var self = this

    for (var i = 0; i < layers.getArray().length; i++) {
      if (layers.getArray()[i] instanceof OLLayerGroup) {
        self.buildExtent(extent, layers.getArray()[i].getLayers())
      } else {
        OLExtentUtils.extend(extent, layers.getArray()[i].getSource().getExtent())
      }
    }
  }

  fitMapToContents() {
    var self = this
    var extent = OLExtentUtils.createEmpty()

    self.buildExtent(extent, self.contentsLayerGroup.getLayers())

    self.map.getView().fit(extent, {
      duration: 250,
      maxZoom: 16,
      padding: [32, 32, 32, 32],
      size: self.map.getSize()
    })
  }

  adjustMapContentsBasedOnZoom(zoom) {
    var self = this

    self.routeStopsLayerGroup.setVisible(zoom >= 14)
  }

  adjustMapContentsBasedOnEnabledRoutes() {
    var self = this

    _.each(self.routes, (route) => {
      route.layers.paths.setVisible(false)
      route.layers.stops.setVisible(false)
      route.layers.realtime.setVisible(false)
    })

    _.each(self.enabledRoutes, (flag, id) => {
      self.routes[id].layers.paths.setVisible(true)
      self.routes[id].layers.stops.setVisible(true)
      self.routes[id].layers.realtime.setVisible(true)
    })
  }

  bootstrapData(callback) {
    var self = this

    fetch(self.endpoint + '/v2/services/active')
      .then((servicesResponse) => servicesResponse.json())
      .then((services) => {
        self.services = services

        var ids = services.map((service) => service.id)

        Promise.all(services.map((service) => {
          return fetch(self.endpoint + '/v2/routes/service/' + service.id)
        })).then((routeResponses) => {
          return Promise.all(routeResponses.map((routeResponse) => routeResponse.json()))
        }).then((routes) => {
          return Promise.all(_.flatten(routes).filter((route) => {
            if (!!self.lines) {
              let regex = new RegExp(self.lines)
              return regex.test(route.shortName) || regex.test(route.longName)
            }

            return true
          }).map((route) => {
            return fetch(self.endpoint + '/v2/routes/' + route.id)
          }))
        }).then((routeResponses) => {
          return Promise.all(routeResponses.map((routeResponse) => routeResponse.json()))
        }).then((routes) => {
          routes = routes.map((route) => {
            return _.extend({}, route, {
              services: route.services.filter((service) => _.indexOf(ids, service.serviceId) !== -1)
            })
          })

          routes = routes.filter((route) => route.services.length > 0)

          routes.forEach((route) => {
            self.routes[route.id] = route
            self.enabledRoutes[route.id] = true
          })

          _.each(self.routes, (route) => {
            route.layers = {
              paths: new OLVectorLayer({
                source: new OLVectorSource({
                  features: []
                }),
                style: new OLStyle({
                  stroke: new OLStroke({
                    color: route.color,
                    width: 5
                  })
                }),
                zIndex: 100
              }),
              stops: new OLVectorLayer({
                source: new OLVectorSource({
                  features: []
                }),
                style: new OLStyle({
                  image: new OLCircleStyle({
                    radius: 6,
                    fill: new OLFill({color: '#ffffff'}),
                    stroke: new OLStroke({color: '#000000', width: 2})
                  })
                }),
                zIndex: 200
              }),
              realtime: new OLVectorLayer({
                source: new OLVectorSource({
                  features: []
                }),
                zIndex: 300
              })
            }

            Promise.all(route.services.map((routeService) => {
              return fetch(self.endpoint + '/v2/routes/' + route.id + '/' + routeService.serviceId + '/' + routeService.variantId + '/geometry.geojson')
            })).then((responses) => {
              return Promise.all(responses.map((response) => response.json())).then((geometries) => {
                route.layers.paths.getSource().addFeatures(geometries.map((geometry) => {
                  return (new OLGeoJSON()).readFeature(geometry, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857'
                  })
                }))
              })
            })

            route.services.forEach((routeService) => {
              routeService.stops.forEach((stop) => {
                route.layers.stops.getSource().addFeature(new OLFeature({
                  properties: {
                    type: 'Stop',
                    id: stop.id
                  },
                  geometry: new OLPoint(OLProjectionFromLonLat([stop.longitude, stop.latitude]))
                }))
              })
            })

            self.routePathsLayerGroup.getLayers().push(route.layers.paths)
            self.routeStopsLayerGroup.getLayers().push(route.layers.stops)
            self.routeVehiclesLayerGroup.getLayers().push(route.layers.realtime)
          })

          if (!!callback) callback()
        })
      })
  }

  updateVehiclePositions() {
    var self = this

    fetch(self.endpoint + '/geojson/realtime')
      .then((response) => response.json())
      .then((realtime) => {
        _.each(self.routes, (route) => {
          route.layers.realtime.getSource().clear()
        })

        realtime.features.forEach((feature) => {
          if (!!self.routes[feature.properties.li_nr]) {
            var route = self.routes[feature.properties.li_nr]

            var vehicleColor = '#' + (feature.properties.hexcolor || '000000')

            var vehicleFeature = new OLFeature({
              geometry: new OLPoint(OLProjectionFromLonLat(feature.geometry.coordinates))
            })

            vehicleFeature.setStyle(new OLStyle({
              image: new OLIcon({
                scale: 0.8,
                src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(assets__bus_icon.replace(/#000000/g, vehicleColor))
              })
            }))

            route.layers.realtime.getSource().addFeature(vehicleFeature)
          }
        })
      })
  }

  async firstUpdated() {
    let self = this
    let root = self.shadowRoot

    self.dialog = root.getElementById('dialog')
    self.dialogTitle = root.getElementById('dialog-title')
    self.dialogContents = root.getElementById('dialog-contents')

    self.backdropLayers = {
      standard: new OLTileLayer({
        source: new OLOSM(),
        visible: true,
        zIndex: 0
      }),
      satellite: new OLTileLayer({
        source: new OLXYZ({
          attributions: ['Powered by Esri', 'Source: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'],
          attributionsCollapsible: false,
          url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          maxZoom: 23
        }),
        visible: false,
        zIndex: 0
      })
    }

    self.routePathsLayerGroup = new OLLayerGroup({
      layers: []
    })

    self.routeStopsLayerGroup = new OLLayerGroup({
      layers: []
    })

    self.routeVehiclesLayerGroup = new OLLayerGroup({
      layers: []
    })

    self.currentPositionFeature = null

    self.currentPositionLayer = new OLVectorLayer({
      source: new OLVectorSource({
        features: []
      }),
      zIndex: 500
    })

    self.contentsLayerGroup = new OLLayerGroup({
      layers: [
        self.routePathsLayerGroup,
        self.routeStopsLayerGroup,
        self.routeVehiclesLayerGroup,
        self.currentPositionLayer
      ]
    })

    self.map = new OLMap({
      target: root.getElementById('map'),
      layers: [
        self.backdropLayers.standard,
        self.backdropLayers.satellite,
        self.contentsLayerGroup
      ],
      controls: [],
      view: new OLView({
        center: OLProjectionFromLonLat([11.332667, 46.478756]),
        zoom: 13
      })
    })

    self.geolocation = new OLGeolocation({
      trackingOptions: {
        enableHighAccuracy: true
      },
      projection: self.map.getView().getProjection()
    })

    self.geolocation.on('change', () => {
      var position = self.geolocation.getPosition()

      if (!self.currentPositionFeature) {
        self.currentPositionFeature = new OLFeature({
          geometry: new OLPoint(position)
        })

        self.currentPositionFeature.setStyle(new OLStyle({
          image: new OLCircleStyle({
            radius: 8,
            fill: new OLFill({color: '#0077ff'}),
            stroke: new OLStroke({color: '#ffffff', width: 2})
          })
        }))

        self.currentPositionLayer.getSource().addFeature(self.currentPositionFeature)

        self.map.getView().animate({
          duration: 250,
          center: position,
          zoom: 16
        })
      } else {
        self.currentPositionFeature.setGeometry(new OLPoint(position))
      }
    })

    root.getElementById('close-dialog').onclick = () => {
      self.dialog.opened = false

      return false
    }

    root.getElementById('zoom-in').onclick = () => {
      self.map.getView().animate({
        duration: 250,
        zoom: self.map.getView().getZoom() + 0.75
      })

      return false
    }

    root.getElementById('zoom-out').onclick = () => {
      self.map.getView().animate({
        duration: 250,
        zoom: self.map.getView().getZoom() - 0.75
      })

      return false
    }

    root.getElementById('fit').onclick = () => {
      self.fitMapToContents()

      return false
    }

    root.getElementById('layers').onclick = () => {
      if (self.backdropLayers.standard.getVisible()) {
        self.backdropLayers.satellite.setVisible(true)
        self.backdropLayers.standard.setVisible(false)
      } else {
        self.backdropLayers.standard.setVisible(true)
        self.backdropLayers.satellite.setVisible(false)
      }

      return false
    }

    root.getElementById('track').onclick = () => {
      if (self.geolocation.getTracking()) {
        self.geolocation.setTracking(false)

        root.getElementById('track').classList.remove('is-active')

        self.currentPositionLayer.getSource().removeFeature(self.currentPositionFeature)

        self.currentPositionFeature = null

        self.map.getView().setRotation(0)
      } else {
        self.geolocation.setTracking(true)

        root.getElementById('track').classList.add('is-active')
      }

      return false
    }

    root.getElementById('settings').onclick = () => {
      var contents = ''

      contents += '<div class="map-settings">'

      contents += '<div class="contains-selection-links">'
      contents += '<a id="select-all-routes" href="#">Select all</a>'
      contents += '<a id="unselect-all-routes" href="#">Select none</a>'
      contents += '</div>'

      contents += '<div class="contains-route-checkboxes">'

      _.each(_.sortBy(_.values(self.routes), (route) => _.padStart(route.shortName, 4, '0')), (route) => {
        contents += '<div class="contains-route-checkbox">' +
          '<div class="wrapper" style="background-color: ' + route.color + ';">' +
            '<span>' + route.shortName + '</span>' +
            '<paper-checkbox data-route="' + route.id + '" ' + (_.has(self.enabledRoutes, route.id) ? 'checked' : '') + ' style="--paper-checkbox-checkmark-color: ' + route.color + ';"></paper-checkbox>' +
          '</div>' +
        '</div>'
      })

      contents += '</div>'

      contents += '</div>'

      self.dialogTitle.textContent = 'SETTINGS'
      self.dialogContents.innerHTML = contents

      var elements = self.dialogContents.querySelectorAll('.contains-route-checkbox')
      for (var i = 0; i < elements.length; i++) {
        elements[i].checked = true
      }

      self.dialogContents.querySelector('#select-all-routes').onclick = () => {
        _.each(self.routes, (route) => {
          self.enabledRoutes[route.id] = true
        })

        var checkboxes = self.dialogContents.querySelectorAll('paper-checkbox')
        for (var i = 0; i < checkboxes.length; i++) {
          checkboxes[i].checked = true
        }

        self.adjustMapContentsBasedOnEnabledRoutes()
      }

      self.dialogContents.querySelector('#unselect-all-routes').onclick = () => {
        self.enabledRoutes = {}

        var checkboxes = self.dialogContents.querySelectorAll('paper-checkbox')
        for (var i = 0; i < checkboxes.length; i++) {
          checkboxes[i].checked = false
        }

        self.adjustMapContentsBasedOnEnabledRoutes()
      }

      let checkboxUpdated = (checkbox) => {
        var routeID = checkbox.getAttribute('data-route')

          if (checkbox.checked) {
            self.enabledRoutes[routeID] = true
          } else {
            delete self.enabledRoutes[routeID]
          }

          self.adjustMapContentsBasedOnEnabledRoutes()
      }

      var checkboxes = self.dialogContents.querySelectorAll('paper-checkbox')
      for (var i = 0; i < checkboxes.length; i++) {
        let checkbox = checkboxes[i]

        checkbox.addEventListener('change', (e) => {
          checkboxUpdated(checkbox)
        }, false)
      }

      var wrappers = self.dialogContents.querySelectorAll('.wrapper')
      for (var i = 0; i < wrappers.length; i++) {
        let wrapper = wrappers[i]

        wrapper.onclick = (e) => {
          if (e.target.classList.contains('wrapper')) {
            let checkbox = wrapper.querySelector('paper-checkbox')

            checkbox.checked = !checkbox.checked

            checkboxUpdated(checkbox)
          }

          return false
        }
      }

      self.dialog.opened = true

      return false
    }

    self.bootstrapData(() => {
      self.adjustMapContentsBasedOnZoom(self.map.getView().getZoom())

      self.fitMapToContents()

      self.updateVehiclePositions()

      setInterval(() => {
        self.updateVehiclePositions()
      }, 2000)
    })

    var zoom = self.map.getView().getZoom()

    self.map.on('moveend', (e) => {
      if (zoom !== self.map.getView().getZoom()) {
        zoom = self.map.getView().getZoom()

        self.adjustMapContentsBasedOnZoom(zoom)
      }
    })
  }
}

customElements.define('mobility-map', MobilityMap);