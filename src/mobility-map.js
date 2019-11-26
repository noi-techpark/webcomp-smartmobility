import { LitElement, html } from 'lit-element';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-dialog/paper-dialog.js';

import _ from 'lodash';
import moment from 'moment';
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
import assets__stop_icon from './assets/stop.svg';
import assets__track_icon from './assets/track.svg';
import assets__zoom_in_icon from './assets/zoom-in.svg';
import assets__zoom_out_icon from './assets/zoom-out.svg';

const configuration = {
  intervals: {
    refreshStopDetails: 20000,
    refreshVehicleDetails: 5000,
    refreshVehicles: 2500
  },
  layers: {
    backdrops: 100,
    paths: 200,
    stops: 300,
    vehicles: 400,
    currentPosition: 500
  },
  zooms: {
    revealCurrentPosition: 16,
    highlightFeature: 16,
    stopsThreshold: 14
  }
}

class SmartMobilityMap extends LitElement {

  constructor() {
    super()

    this.endpointBaseUrl = 'http://0.0.0.0'
    this.routesFilter = '.*'

    this.services = []
    this.routes = {}
    this.stops = {}
    this.vehicles = {}

    this.enabledRoutes = {}
  }

  static get properties() {
    return {
      endpointBaseUrl: { attribute: 'endpoint', type: String },
      routesFilter: { attribute: 'routes', type: String },
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
          display: flex;
          margin: 0;
          padding: 16px 16px 8px 24px;
        }

        #dialog .dialog-header #dialog-icon {
          height: 32px;
          margin: 8px 0 0 0;
          width: 32px;
        }

        #dialog .dialog-header h2 {
          flex: 1;
          float: left;
          font-size: 1.8em;
          line-height: 1.2em;
          margin: 8px 16px 0 16px;
        }

        #dialog .dialog-header #close-dialog {
          box-sizing: border-box;
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
          border: 0;
          border-collapse: collapse;
          width: 100%;
        }

        #dialog .stop-details .placeholder,
        #dialog .vehicle-details .placeholder {
          display: none;
          font-size: 1.2em;
          padding: 16px 0;
        }

        #dialog .stop-details.is-empty .placeholder,
        #dialog .vehicle-details.is-empty .placeholder {
          display: block;
        }

        #dialog .stop-details.is-empty table,
        #dialog .vehicle-details.is-empty table {
          display: none;
        }

        #dialog .stop-details table thead th,
        #dialog .vehicle-details table thead th {
          border-bottom: 1px solid #666666;
        }

        #dialog .stop-details table tr th,
        #dialog .vehicle-details table tr th {
          padding: 8px 2px;
        }

        #dialog .stop-details table tr td,
        #dialog .vehicle-details table tr td {
          padding: 8px 0;
        }

        #dialog .stop-details table tbody tr:first-child td,
        #dialog .vehicle-details table tbody tr:first-child td {
          padding-top: 16px;
        }

        #dialog .stop-details table tr th,
        #dialog .vehicle-details table tr th {
          color: #666666;
          font-size: 1.5em;
        }

        #dialog .stop-details table tr .contains-route,
        #dialog .vehicle-details table tr .contains-stop {
          text-align: left;
        }

        #dialog .stop-details table tr td.contains-route,
        #dialog .vehicle-details table tr td.contains-stop {
          display: flex;
          align-items: center;
        }

        #dialog .stop-details table tr .contains-time,
        #dialog .vehicle-details table tr .contains-time {
          text-align: center;
          width: 96px;
        }

        #dialog .stop-details table tr td .contains-icon,
        #dialog .vehicle-details table tr td .contains-icon {
          cursor: pointer;
          display: inline-block;
          height: 24px;
          width: 24px;
        }

        #dialog .stop-details table tr td .contains-icon svg,
        #dialog .vehicle-details table tr td .contains-icon svg {
          display: inline-block;
          height: 24px;
          width: 24px;
        }

        #dialog .stop-details table tr td .route,
        #dialog .vehicle-details table tr td .stop {
          display: inline-block;
          flex: 1;
          font-size: 1.5em;
          margin: 0 16px;
        }

        #dialog .stop-details table tr td .time,
        #dialog .vehicle-details table tr td .time {
          font-size: 1.5em;
        }

        #dialog .stop-details .last-updated,
        #dialog .vehicle-details .last-updated {
          font-size: 1em;
          padding: 16px 0;
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
            <div id="dialog-icon"></div>
            <h2 id="dialog-title"></h2>
            <a href="#" id="close-dialog">
              <img src="data:image/svg+xml;base64,${btoa(assets__close_icon)}"/>
            </a>
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

  getStopStyle() {
    return new OLStyle({
      image: new OLCircleStyle({
        radius: 6,
        fill: new OLFill({ color: '#ffffff' }),
        stroke: new OLStroke({ color: '#000000', width: 2 })
      })
    })
  }

  getPathStyle(color) {
    return new OLStyle({
      stroke: new OLStroke({
        color: color,
        width: 5
      })
    })
  }

  getVehicleStyle(color) {
    return new OLStyle({
      image: new OLIcon({
        scale: 0.8,
        src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(assets__bus_icon.replace(/#000000/g, color))
      })
    })
  }

  getCurrentPositionStyle() {
    return new OLStyle({
      image: new OLCircleStyle({
        radius: 8,
        fill: new OLFill({ color: '#0077ff' }),
        stroke: new OLStroke({ color: '#ffffff', width: 2 })
      })
    })
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

    self.routeStopsLayerGroup.setVisible(zoom >= configuration.zooms.stopsThreshold)
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

    fetch(self.endpointBaseUrl + '/v2/services/active')
      .then((servicesResponse) => servicesResponse.json())
      .then((services) => {
        self.services = services

        var ids = services.map((service) => service.id)

        Promise.all(services.map((service) => {
          return fetch(self.endpointBaseUrl + '/v2/routes/service/' + service.id)
        })).then((routeResponses) => {
          return Promise.all(routeResponses.map((routeResponse) => routeResponse.json()))
        }).then((routes) => {
          return Promise.all(_.flatten(routes).filter((route) => {
            if (!!self.routesFilter) {
              let regex = new RegExp(self.routesFilter)
              return regex.test(route.shortName) || regex.test(route.longName)
            }

            return true
          }).map((route) => {
            return fetch(self.endpointBaseUrl + '/v2/routes/' + route.id)
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
                style: self.getPathStyle(route.color),
                zIndex: configuration.layers.paths
              }),
              stops: new OLVectorLayer({
                source: new OLVectorSource({
                  features: []
                }),
                style: self.getStopStyle(),
                zIndex: configuration.layers.stops
              }),
              realtime: new OLVectorLayer({
                source: new OLVectorSource({
                  features: []
                }),
                zIndex: configuration.layers.vehicles
              })
            }

            Promise.all(route.services.map((routeService) => {
              return fetch(self.endpointBaseUrl + '/v2/routes/' + route.id + '/' + routeService.serviceId + '/' + routeService.variantId + '/geometry.geojson')
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
                var feature = new OLFeature({
                  properties: {
                    type: 'Stop',
                    id: stop.id
                  },
                  geometry: new OLPoint(OLProjectionFromLonLat([stop.longitude, stop.latitude]))
                })

                route.layers.stops.getSource().addFeature(feature)

                if (!_.has(self.stops, stop.id)) {
                  self.stops[stop.id] = {
                    point: feature.getGeometry(),
                    features: []
                  }
                }

                self.stops[stop.id].features.push(feature)
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

    fetch(self.endpointBaseUrl + '/geojson/realtime')
      .then((response) => response.json())
      .then((realtime) => {
        var processed = {}

        realtime.features.forEach((feature) => {
          if (!!self.routes[feature.properties.li_nr]) {
            var route = self.routes[feature.properties.li_nr]
            var tripID = feature.properties.frt_fid

            var point = new OLPoint(OLProjectionFromLonLat(feature.geometry.coordinates))

            if (!_.has(self.vehicles, tripID)) {
              var vehicleFeature = new OLFeature({
                properties: {
                  type: 'Vehicle',
                  id: feature.properties.frt_fid
                },
                geometry: new OLPoint(OLProjectionFromLonLat(feature.geometry.coordinates))
              })

              vehicleFeature.setStyle(self.getVehicleStyle('#' + (feature.properties.hexcolor || '000000')))

              route.layers.realtime.getSource().addFeature(vehicleFeature)

              self.vehicles[tripID] = {
                routeID: route.id,
                point: point,
                source: route.layers.realtime.getSource(),
                feature: vehicleFeature
              }
            } else {
              self.vehicles[tripID].point = point
              self.vehicles[tripID].feature.setGeometry(point)
            }

            processed[tripID] = true
          }
        })

        _.each(self.vehicles, (vehicle, tripID) => {
          if (!_.has(processed, tripID)) {
            self.vehicles[tripID].source.removeFeature(self.vehicles[tripID].feature)
            delete self.vehicles[tripID]
          }
        })
      })
  }

  formatTime(formattedTime) {
    var matches = formattedTime.match(/([0-9]{2}):([0-9]{2}):([0-9]{2})/)
    return matches[1] + ':' + matches[2]
  }

  showStopDetails(stopID) {
    var self = this

    if (!!self.dialogCloseCallback) {
      self.dialogCloseCallback()
      self.dialogCloseCallback = null
    }

    let refreshDetails = (callback) => {
      var now = new Date()

      fetch(self.endpointBaseUrl + '/v2/stop-times/stop/' + stopID + '/after/' + moment().format('HH:mm:ss'))
        .then((response) => response.json())
        .then((result) => {
          var stopTimes = _.sortBy(result, 'departureTime')

          stopTimes = _.filter(stopTimes, (stopTime) => {
            return _.indexOf(self.services.map((service) => service.id), stopTime.serviceId) !== -1
          })

          stopTimes = _.slice(stopTimes, 0, 12)

          if (stopTimes.length === 0) {
            self.dialogContents.querySelector('.stop-details').classList.add('is-empty')

            self.dialogContents.querySelector('.last-updated').textContent = 'Last updated on ' + moment().format('DD/MM/YYYY HH:mm:ss')

            if (!!callback) callback()
          } else {
            Promise.all(stopTimes.map((stopTime) => {
              return fetch(self.endpointBaseUrl + '/v2/trips/' + stopTime.tripId)
            }))
              .then((responses) => Promise.all(responses.map((response) => response.json())))
              .then((trips) => {
                var contents = []

                for (var i = 0; i < stopTimes.length; i++) {
                  var stopTime = stopTimes[i]
                  var trip = trips[i]

                  contents.push('<tr>')

                  contents.push('<td class="contains-route">')
                  contents.push('<a href="#" class="contains-icon" data-trip="' + trip.id + '">')
                  contents.push(assets__bus_icon.replace(/#000000/g, trip.route.color))
                  contents.push('</a>')
                  contents.push('<span class="route">' + trip.route.shortName + '</span>')
                  contents.push('</td>')

                  contents.push('<td class="contains-time">')
                  contents.push('<span class="time">' + self.formatTime(stopTime.departureTime) + '</span>')
                  contents.push('</td>')

                  contents.push('</tr>')
                }

                self.dialogContents.querySelector('.stop-details').classList.remove('is-empty')

                self.dialogContents.querySelector('table tbody').innerHTML = contents.join('')

                var vehicleLinks = self.dialogContents.querySelectorAll('table tbody td.contains-route a')
                for (var i = 0; i < vehicleLinks.length; i++) {
                  let link = vehicleLinks[i]

                  link.onclick = (e) => {
                    self.highlightVehicle(link.getAttribute('data-trip'))
                    return false
                  }
                }

                self.dialogContents.querySelector('.last-updated').textContent = 'Last updated on ' + moment().format('DD/MM/YYYY HH:mm:ss')

                if (!!callback) callback()
              })
          }
        })
    }

    fetch(self.endpointBaseUrl + '/v2/stops/' + stopID)
      .then((response) => response.json())
      .then((stop) => {
        var contents = []

        contents.push('<div class="stop-details">')

        contents.push('<div class="placeholder">There are currently no upcoming stops at this location.</div>')

        contents.push('<table>')

        contents.push('<thead>')
        contents.push('<tr>')
        contents.push('<th class="contains-route">LINE</th>')
        contents.push('<th class="contains-time">TIME</th>')
        contents.push('</tr>')
        contents.push('</thead>')
        contents.push('<tbody>')
        contents.push('</tbody>')
        contents.push('</table>')

        contents.push('<div class="last-updated"></div>')

        contents.push('</div>')

        self.dialogIcon.innerHTML = assets__stop_icon
        self.dialogTitle.textContent = stop.name
        self.dialogContents.innerHTML = contents.join('')

        var refreshInterval = setInterval(refreshDetails, configuration.intervals.refreshStopDetails)

        self.dialogCloseCallback = () => {
          clearInterval(refreshInterval)
        }

        refreshDetails(() => {
          self.dialog.opened = true
        })
      })
  }

  showVehicleDetails(tripID) {
    var self = this

    if (!!self.dialogCloseCallback) {
      self.dialogCloseCallback()
      self.dialogCloseCallback = null
    }

    let refreshDetails = (callback) => {
      var now = moment().seconds(0).milliseconds(0)

      fetch(self.endpointBaseUrl + '/v2/trips/' + tripID)
        .then((response) => response.json())
        .then((trip) => {
          var stops = trip.stops

          stops = _.filter(stops, (stop) => {
            return moment(moment().format('YYYY-MM-DD') + ' ' + stop.departureTime).isSameOrAfter(now)
          })

          stops = _.slice(stops, 0, 12)

          if (stops.length === 0) {
            self.dialogContents.querySelector('.vehicle-details').classList.add('is-empty')

            self.dialogContents.querySelector('.last-updated').textContent = 'Last updated on ' + moment().format('DD/MM/YYYY HH:mm:ss')

            if (!!callback) callback()
          } else {
            var contents = []

            for (var i = 0; i < stops.length; i++) {
              var stop = stops[i]

              contents.push('<tr>')

              contents.push('<td class="contains-stop">')
              contents.push('<a href="#" class="contains-icon" data-stop="' + stop.id + '">')
              contents.push(assets__stop_icon)
              contents.push('</a>')
              contents.push('<span class="stop">' + stop.name + '</span>')
              contents.push('</td>')

              contents.push('<td class="contains-time">')
              contents.push('<span class="time">' + self.formatTime(stop.departureTime) + '</span>')
              contents.push('</td>')

              contents.push('</tr>')
            }

            self.dialogContents.querySelector('.vehicle-details').classList.remove('is-empty')

            self.dialogContents.querySelector('table tbody').innerHTML = contents.join('')

            var stopLinks = self.dialogContents.querySelectorAll('table tbody td.contains-stop a')
            for (var i = 0; i < stopLinks.length; i++) {
              let link = stopLinks[i]

              link.onclick = (e) => {
                self.highlightStop(link.getAttribute('data-stop'))
                return false
              }
            }

            self.dialogContents.querySelector('.last-updated').textContent = 'Last updated on ' + moment().format('DD/MM/YYYY HH:mm:ss')

            if (!!callback) callback()
          }
        })
    }

    var vehicle = self.vehicles[tripID]

    fetch(self.endpointBaseUrl + '/v2/routes/' + vehicle.routeID)
      .then((response) => response.json())
      .then((route) => {
        var contents = []

        contents.push('<div class="vehicle-details">')

        contents.push('<div class="placeholder">There are currently no upcoming stops for this vehicle.</div>')

        contents.push('<table>')

        contents.push('<thead>')
        contents.push('<tr>')
        contents.push('<th class="contains-stop">STOP</th>')
        contents.push('<th class="contains-time">TIME</th>')
        contents.push('</tr>')
        contents.push('</thead>')
        contents.push('<tbody>')
        contents.push('</tbody>')
        contents.push('</table>')

        contents.push('<div class="last-updated"></div>')

        contents.push('</div>')

        self.dialogIcon.innerHTML = assets__bus_icon.replace(/#000000/g, route.color)
        self.dialogTitle.textContent = route.shortName
        self.dialogContents.innerHTML = contents.join('')

        var refreshInterval = setInterval(refreshDetails, configuration.intervals.refreshVehicleDetails)

        self.dialogCloseCallback = () => {
          clearInterval(refreshInterval)
        }

        refreshDetails(() => {
          self.dialog.opened = true
        })
      })
  }

  highlightStop(stopID) {
    var self = this

    if (_.has(self.stops, stopID)) {
      self.map.getView().animate({
        duration: 250,
        center: self.stops[stopID].point.getCoordinates(),
        zoom: configuration.zooms.highlightFeature
      })
    }
  }

  highlightVehicle(tripID) {
    var self = this

    if (_.has(self.vehicles, tripID)) {
      self.map.getView().animate({
        duration: 250,
        center: self.vehicles[tripID].point.getCoordinates(),
        zoom: configuration.zooms.highlightFeature
      })
    }
  }

  async firstUpdated() {
    let self = this
    let root = self.shadowRoot

    self.dialog = root.getElementById('dialog')
    self.dialog.noCancelOnOutsideClick = true

    self.dialogIcon = root.getElementById('dialog-icon')
    self.dialogTitle = root.getElementById('dialog-title')
    self.dialogContents = root.getElementById('dialog-contents')
    self.dialogCloseCallback = null

    self.dialog.addEventListener('opened-changed', (e) => {
      if (!self.dialog.opened && !!self.dialogCloseCallback) {
        self.dialogCloseCallback()
        self.dialogCloseCallback = null
      }
    })

    self.backdropLayers = {
      standard: new OLTileLayer({
        source: new OLOSM(),
        visible: true,
        zIndex: configuration.layers.backdrops
      }),
      satellite: new OLTileLayer({
        source: new OLXYZ({
          attributions: ['Powered by Esri', 'Source: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'],
          attributionsCollapsible: false,
          url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          maxZoom: 23
        }),
        visible: false,
        zIndex: configuration.layers.backdrops
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
      zIndex: configuration.layers.currentPosition
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

        self.currentPositionFeature.setStyle(self.getCurrentPositionStyle())

        self.currentPositionLayer.getSource().addFeature(self.currentPositionFeature)

        self.map.getView().animate({
          duration: 250,
          center: position,
          zoom: configuration.zooms.revealCurrentPosition
        })
      } else {
        self.currentPositionFeature.getGeometry().setCoordinates(position)
      }
    })

    self.select = new OLSelect({
      condition: OLClickCondition,
      style: (feature) => {
        var config = feature.getProperties()

        if (config.properties.type === 'Stop') {
          return self.getStopStyle()
        }

        if (config.properties.type === 'Vehicle') {
          return self.getVehicleStyle(self.routes[config.properties.routeID].color || '#000000')
        }

        return null
      }
    })

    self.select.on('select', (e) => {
      self.select.getFeatures().clear()

      if (!!e.selected && e.selected.length === 1) {
        var values = e.selected[0].getProperties()

        if (!!values.properties && values.properties.type === 'Stop') {
          self.showStopDetails(values.properties.id)
        }

        if (!!values.properties && values.properties.type === 'Vehicle') {
          self.showVehicleDetails(values.properties.id)
        }
      }
    })

    self.map.addInteraction(self.select)

    self.map.on('pointermove', (e) => {
      var pixel = self.map.getEventPixel(e.originalEvent)

      var features = self.map.getFeaturesAtPixel(pixel)

      if (!features) {
        features = []
      }

      features = features.filter((feature) => {
        return !!feature.getProperties().properties && (
          feature.getProperties().properties.type === 'Stop' ||
          feature.getProperties().properties.type === 'Vehicle'
        )
      })

      self.map.getViewport().style.cursor = features.length > 0 ? 'pointer' : ''
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
      }, configuration.intervals.refreshVehicles)
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

if (!customElements.get('smart-mobility')) {
  customElements.define('smart-mobility', SmartMobilityMap);
}