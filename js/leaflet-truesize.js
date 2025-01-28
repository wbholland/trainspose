import L from 'leaflet'
import turfBearing from '@turf/bearing'
import turfDistance from '@turf/distance'
import turfDestination from '@turf/destination'
import transformRotate from '@turf/transform-rotate'
import { coordAll as turfCoordAll } from '@turf/meta'
import 'leaflet.path.drag'

let id = 0

L.TrueSize = L.Layer.extend({
  geoJSON: {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: []
    }
  },

  options: {
    color: '#3DAE2B',
    stroke: true,
    weight: 1,
    opacity: 1,
    lineCap: 'round',
    lineJoin: 'round',
    dashArray: null,
    dashOffset: null,
    fill: true,
    fillColor: '#3DAE2B',
    fillOpacity: 0.3,
    fillRule: 'evenodd',
    className: null,
    clickable: false
  },

  initialize (geoJSON = this.geoJSON, options = {}) {
    // merge default and passed options
    this._options = Object.assign({}, this.options, options)
    this._geometryType = geoJSON.geometry.type
    this._isMultiPolygon = this._geometryType === 'MultiPolygon'
    this._isMultiLineString = this._geometryType === 'MultiLineString'
    this._rotation = 0

    L.Util.setOptions(this, this._options)
    this._initGeoJson(geoJSON, this._options)
  },

  _initGeoJson (geoJSON, options) {
    this._geoJSONLayer = L.geoJSON(geoJSON, options)

    // for unique plugin id
    this._currentId = id++
  },

  setCenter (center) {
    this._center = center
    this._redraw()
    this._refreshDraggable()
  },

  getCenter () {
    return this._center
  },

  getBounds () {
    return this._currentLayer.getBounds()
  },

  setRotation (degrees) {
    this._rotation = degrees
    this._redraw()
    this._refreshDraggable()
  },

  reset () {
    if (!this._origCenter) {
      return false
    }

    this._center = this._origCenter
    this._redraw()
    this._refreshDraggable()
  },

  onAdd (map) {
    this._map = map
    this._geoJSONLayer.addTo(this._map)

    // our currentlayer is always the first layer of geoJson layersgroup
    // but has a dynamic key
    this._currentLayer = this._geoJSONLayer.getLayers()[0]

    this._draggable = this._createDraggable(this._currentLayer.getBounds())
    this._draggable.addTo(this._map)

    const centerCoords = this._draggable.getCenter()
    this._origCenter = [centerCoords.lng, centerCoords.lat]
    this._center = [...this._origCenter]

    this._initialBearingDistance = this._getBearingDistance(this._origCenter)
  },

  _createDraggable (bounds) {
    return L.rectangle(bounds, {
      stroke: false,
      fillOpacity: 0.0,
      fillColor: 'gray',
      draggable: true,
      className: 'draggable'
    })
      .on('dragstart', this._onDragStart, this)
      .on('drag', this._onDrag, this)
      .on('dragend', this._onDragEnd, this)
  },

  _refreshDraggable () {
    this._draggable.setBounds(this._currentLayer.getBounds())
    this._draggable.bringToFront()
  },

  _onDragStart () {
    const draggableCenter = this._draggable.getCenter()
    const dragCenterCoords = [draggableCenter.lng, draggableCenter.lat]
    if (this._rotation) {
      this._offset = this._getBearingAndDistance(dragCenterCoords, this._center)
    }
  },

  _onDrag () {
    const draggableCenter = this._draggable.getCenter()
    const dragCenterCoords = [draggableCenter.lng, draggableCenter.lat]
    if (this._rotation) {
      this._center = turfDestination(dragCenterCoords, this._offset.distance, this._offset.bearing).geometry.coordinates
    } else {
      this._center = dragCenterCoords
    }
    this._draggable.setStyle({ fillOpacity: 0.5 })
    this._redraw()
  },

  _onDragEnd () {
    this._refreshDraggable()
    this._draggable.setStyle({ fillOpacity: 0.0 })
  },

  _getBearingDistance (origin) {
    if (this._isMultiPolygon) {
      return this._currentLayer.feature.geometry.coordinates.map(polygon => polygon.map(linestring =>
        linestring.map(point => this._getBearingAndDistance(origin, point)))
      )
    } else if (this._isMultiLineString) {
      return this._currentLayer.feature.geometry.coordinates.map(linestring => linestring.map(point =>
        this._getBearingAndDistance(origin, point))
      )
    } else {
      return turfCoordAll(this._currentLayer.feature).map(point =>
        this._getBearingAndDistance(origin, point)
      )
    }
  },

  _getBearingAndDistance (origin, point) {
    const bearing = turfBearing(origin, point)
    const distance = turfDistance(origin, point, { units: 'kilometers' })
    return { bearing, distance }
  },

  _redraw () {
    let newPoints

    if (this._isMultiPolygon) {
      newPoints = this._initialBearingDistance.map(polygon => polygon.map(linestring =>
        linestring.map(params => {
          return turfDestination(this._center, params.distance, params.bearing, {
            units: 'kilometers'
          }).geometry.coordinates
        }))
      )
    } else if (this._isMultiLineString) {
      newPoints = this._initialBearingDistance.map(linestring =>
        linestring.map(params => {
          return turfDestination(this._center, params.distance, params.bearing, {
            units: 'kilometers'
          }).geometry.coordinates
        })
      )
    } else {
      newPoints = this._initialBearingDistance.map(params => {
        return turfDestination(this._center, params.distance, params.bearing, {
          units: 'kilometers'
        }).geometry.coordinates
      })
    }

    const newFeature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: this._geometryType,
        coordinates: this._getCoordsByType(newPoints, this._geometryType)
      }
    }

    const rotatedFeature = transformRotate(newFeature, this._rotation, { pivot: this._center })

    this._geoJSONLayer.clearLayers()
    this._geoJSONLayer.addData(rotatedFeature)
    // our currentlayer is always the first layer of geoJson layersgroup
    // but has a dynamic key
    this._currentLayer = this._geoJSONLayer.getLayers()[0]
  },

  onRemove (map) {
    this._map = map
    this._map.removeLayer(this._geoJSONLayer)
    this._map.removeLayer(this._draggable)

    return this
  },

  _getCoordsByType (point, type) {
    switch (type) {
      case 'LineString': {
        return point
      }
      case 'Polygon': {
        return [point]
      }
      case 'MultiPolygon': {
        return point
      }
      case 'MultiLineString': {
        return point
      }
      default: {
        return [point]
      }
    }
  }
})

L.trueSize = (geoJSON, options) => new L.TrueSize(geoJSON, options)
