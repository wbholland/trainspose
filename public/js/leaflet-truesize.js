import L from 'leaflet'
import turfBearing from '@turf/bearing'
import turfDistance from '@turf/distance'
import turfDestination from '@turf/destination'
import transformRotate from '@turf/transform-rotate'
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
    this._rotation = 0
    this._mirrored = false

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

  setReflection (isMirrored) {
    this._mirrored = isMirrored
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
    return this._currentLayer.feature.geometry.coordinates.map(linestring => linestring.map(point =>
      this._getBearingAndDistance(origin, point))
    )
  },

  _getBearingAndDistance (origin, point) {
    const bearing = turfBearing(origin, point)
    const distance = turfDistance(origin, point, { units: 'kilometers' })
    return { bearing, distance }
  },

  // _reflect (feature, centerX) {
  //   if (!this._isMultiLineString) return // todo implement other types if needed

  //   const reflectedFeature = structuredClone(feature)
  //   reflectedFeature.geometry.coordinates =
  //     this._currentLayer.feature.geometry.coordinates.map(
  //       linestring => linestring.map(
  //         point => {
  //           const [bearing, distance] = this._getBearingAndDistance(point, [centerX, point[1]])
  //           return turfDestination([centerX, point[1]], distance, bearing).geometry.coordinates
  //         }
  //       )
  //     )
  //   return reflectedFeature
  // },

  _redraw () {
    const newPoints = this._initialBearingDistance.map(linestring =>
      linestring.map(params => {
        return turfDestination(this._center, params.distance, params.bearing * (this._mirrored ? -1 : 1), {
          units: 'kilometers'
        }).geometry.coordinates
      })
    )

    const newFeature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'MultiLineString',
        coordinates: newPoints
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
  }

})

L.trueSize = (geoJSON, options) => new L.TrueSize(geoJSON, options)
