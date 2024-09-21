/**
 * Calculates and displays a car route from the Brandenburg Gate in the centre of Berlin
 * to Friedrichstraße Railway Station.
 *
 * A full list of available request parameters can be found in the Routing API documentation.
 * see: https://www.here.com/docs/bundle/routing-api-v8-api-reference/page/index.html
 *
 * @param {H.service.Platform} platform A stub class to access HERE services
 */
function calculateRouteFromAtoB(platform) {
  var router = platform.getRoutingService(null, 8),
    routeRequestParams = {
      //routingMode: 'fast',
      transportMode: 'car',
      origin: '38.5884,68.72361', // Brandenburg Gate
      destination: '38.57195,68.78493', // Friedrichstraße Railway Station
      return: 'polyline,turnByTurnActions,actions,instructions,travelSummary'
    };

  router.calculateRoute(
    routeRequestParams,
    onSuccess,
    onError
  );
}

let start
let destination

/**
 * This function will be called once the Routing REST API provides a response
 * @param {Object} result A JSON object representing the calculated route.
 * See: https://www.here.com/docs/bundle/routing-api-v8-api-reference/page/index.html
 */
function onSuccess(result) {
  var route = result.routes[0];

  /*
   * The styling of the route response on the map is entirely under the developer's control.
   * A representative styling can be found the full JS + HTML code of this example
   * in the functions below:
   */
  addRouteShapeToMap(route);
  addManueversToMap(route);
  addWaypointsToPanel(route);
  addManueversToPanel(route);
  addSummaryToPanel(route);
  // ... etc.
}

/**
 * This function will be called if a communication error occurs during the JSON-P request
 * @param {Object} error The error message received.
 */
function onError(error) {
  alert('Can\'t reach the remote server\n' + error);
}

/**
 * Boilerplate map initialization code starts below:
 */

// set up containers for the map + panel
var mapContainer = document.getElementById('map'),
  routeInstructionsContainer = document.getElementById('panel');

// Step 1: initialize communication with the platform
// In your own code, replace variable window.apikey with your own apikey
var platform = new H.service.Platform({
  apikey: 'W9cPaucpboszLhvuBo97wqb2LxvoOuuH47Hiao2WeNQ'
});

var defaultLayers = platform.createDefaultLayers();

// Step 2: initialize a map - this map is centered over Berlin
var map = new H.Map(mapContainer,
  defaultLayers.vector.normal.map, {
  center: { lat: 38.57007200333492, lng: 68.76645273540333 },
  zoom: 13,
  pixelRatio: window.devicePixelRatio || 1
});

// add a resize listener to make sure that the map occupies the whole container
window.addEventListener('resize', () => map.getViewPort().resize());

// Step 3: make the map interactive
// MapEvents enables the event system
// Behavior implements default interactions for pan/zoom (also on mobile touch environments)
var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

// Create the default UI components
var ui = H.ui.UI.createDefault(map, defaultLayers);

// Hold a reference to any infobubble opened
var bubble;

var group = new H.map.Group();
map.addObject(group);

// Обработчик кликов
map.addEventListener('tap', function (evt) {
  var coord = map.screenToGeo(evt.currentPointer.viewportX, evt.currentPointer.viewportY);
  addMarker(coord);
});

function addMarker(coord) {
  if (group.getObjects().length === 2) {
    group.removeAll(); // Удаление всех маркеров из группы
    map.getObjects().forEach(function (object) {
      if (object instanceof H.map.Polyline || object instanceof H.map.Marker) {
        map.removeObject(object); // Удаление всех маршрутов с карты
      }
    });
  }
  var marker = new H.map.Marker(coord);
  group.addObject(marker);

  if (group.getObjects().length === 1) {
    start = group.getObjects()[0].getGeometry().lat + ',' + group.getObjects()[0].getGeometry().lng
    document.getElementById('start').value = start
  }

  if (group.getObjects().length === 2) {
    destination = group.getObjects()[1].getGeometry().lat + ',' + group.getObjects()[1].getGeometry().lng
    document.getElementById('destination').value = destination
  }

  if (group.getObjects().length === 2) {
    //calculateRoute();
  }
}

/**
 * Opens/Closes a infobubble
 * @param {H.geo.Point} position The location on the map.
 * @param {String} text          The contents of the infobubble.
 */
function openBubble(position, text) {
  if (!bubble) {
    bubble = new H.ui.InfoBubble(
      position,
      // The FO property holds the province name.
      { content: text });
    ui.addBubble(bubble);
  } else {
    bubble.setPosition(position);
    bubble.setContent(text);
    bubble.open();
  }
}

/**
 * Creates a H.map.Polyline from the shape of the route and adds it to the map.
 * @param {Object} route A route as received from the H.service.RoutingService
 */
function addRouteShapeToMap(route) {
  route.sections.forEach((section) => {
    // decode LineString from the flexible polyline
    let linestring = H.geo.LineString.fromFlexiblePolyline(section.polyline);

    // Create a polyline to display the route:
    let polyline = new H.map.Polyline(linestring, {
      style: {
        lineWidth: 4,
        strokeColor: 'rgba(0, 128, 255, 0.7)'
      }
    });

    // Add the polyline to the map
    map.addObject(polyline);
    // And zoom to its bounding rectangle
    map.getViewModel().setLookAtData({
      bounds: polyline.getBoundingBox()
    });
  });
}

function calculateRoute() {
  var routingParameters = {
    'routingMode': 'fast',
    'transportMode': 'car',
    'origin': group.getObjects()[0].getGeometry().lat + ',' + group.getObjects()[0].getGeometry().lng,
    'destination': group.getObjects()[1].getGeometry().lat + ',' + group.getObjects()[1].getGeometry().lng,
    'return': 'polyline,turnByTurnActions,actions,instructions,travelSummary',
    'lang': 'ru-ru'
  };

  var onResult = function (result) {

    var route = result.routes[0];
    addRouteShapeToMap(route);
    addManueversToMap(route);
    addWaypointsToPanel(route);
    addManueversToPanel(route);
    addSummaryToPanel(route);
  };

  var router = platform.getRoutingService(null, 8);
  router.calculateRoute(routingParameters, onResult, function (error) {
    alert('Can\'t reach the remote server' + error);
  });


}

/**
 * Creates a series of H.map.Marker points from the route and adds them to the map.
 * @param {Object} route A route as received from the H.service.RoutingService
 */

var maneuverGroup = new H.map.Group();
map.addObject(maneuverGroup);

function addManueversToMap(route) {
  var svgMarkup = '<svg width="18" height="18" ' +
    'xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="8" cy="8" r="8" ' +
    'fill="#1b468d" stroke="white" stroke-width="1" />' +
    '</svg>',
    dotIcon = new H.map.Icon(svgMarkup, { anchor: { x: 8, y: 8 } }),
    i,
    j;

  // Очистка группы маневров перед добавлением новых маркеров
  maneuverGroup.removeAll();

  route.sections.forEach((section) => {
    let poly = H.geo.LineString.fromFlexiblePolyline(section.polyline).getLatLngAltArray();

    let actions = section.actions;
    // Add a marker for each maneuver
    for (i = 0; i < actions.length; i += 1) {
      let action = actions[i];
      var marker = new H.map.Marker({
        lat: poly[action.offset * 3],
        lng: poly[action.offset * 3 + 1]
      },
        { icon: dotIcon });
      marker.instruction = action.instruction;
      maneuverGroup.addObject(marker);
    }

    maneuverGroup.addEventListener('tap', function (evt) {
      map.setCenter(evt.target.getGeometry());
      openBubble(evt.target.getGeometry(), evt.target.instruction);
    }, false);
  });
}


/**
 * Creates a series of H.map.Marker points from the route and adds them to the map.
 * @param {Object} route A route as received from the H.service.RoutingService
 */
function addWaypointsToPanel(route) {
  var nodeH3 = document.createElement('h3'),
    labels = [];

  route.sections.forEach((section) => {
    labels.push(
      section.turnByTurnActions[0].nextRoad.name[0].value)
    labels.push(
      section.turnByTurnActions[section.turnByTurnActions.length - 1].currentRoad.name[0].value)
  });

  nodeH3.textContent = labels.join(' - ');
  routeInstructionsContainer.innerHTML = '';
  routeInstructionsContainer.appendChild(nodeH3);
}

/**
 * Creates a series of H.map.Marker points from the route and adds them to the map.
 * @param {Object} route A route as received from the H.service.RoutingService
 */
function addSummaryToPanel(route) {
  let duration = 0,
    distance = 0;

  route.sections.forEach((section) => {
    distance += section.travelSummary.length;
    duration += section.travelSummary.duration;
  });

  var summaryDiv = document.createElement('div'),
    content = '<b>Общее расстояние</b>: ' + distance + 'м. <br />' +
      '<b>Время в дороге</b>: ' + toMMSS(duration);

  summaryDiv.style.fontSize = 'small';
  summaryDiv.style.marginLeft = '25%';
  summaryDiv.style.marginRight = '25%';
  summaryDiv.innerHTML = content;
  routeInstructionsContainer.appendChild(summaryDiv);
}

/**
 * Creates a series of H.map.Marker points from the route and adds them to the map.
 * @param {Object} route A route as received from the H.service.RoutingService
 */
function addManueversToPanel(route) {
  var nodeOL = document.createElement('ol');

  nodeOL.style.fontSize = 'small';
  nodeOL.style.marginLeft = '25%';
  nodeOL.style.marginRight = '25%';
  nodeOL.className = 'directions';

  route.sections.forEach((section) => {
    section.actions.forEach((action, idx) => {
      var li = document.createElement('li'),
        spanArrow = document.createElement('span'),
        spanInstruction = document.createElement('span');

      spanArrow.className = 'arrow ' + (action.direction || '') + action.action;
      spanInstruction.innerHTML = section.actions[idx].instruction;
      li.appendChild(spanArrow);
      li.appendChild(spanInstruction);

      nodeOL.appendChild(li);
    });
  });

  routeInstructionsContainer.appendChild(nodeOL);
}

function toMMSS(duration) {
  return Math.floor(duration / 3600) + ' hours ' + Math.floor((duration % 3600) / 60) + ' minutes ' + (duration % 60) + ' seconds.';
}

// Now use the map as required...
//calculateRouteFromAtoB(platform);

function mainMF() {
  const data = {
    origin: start,
    destination: destination,
    transportMode: document.getElementById('mySelect').value
  };

  // Отправка POST-запроса
  fetch('http://localhost:8182/calculateRoute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Ошибка в запросе: ' + response.status);
      }
      return response.json(); // Парсинг ответа
    })
    .then(result => {
      console.log('Успешный ответ:', result);
      calculateRoute();

      const reportContent = document.getElementById('report-content');
      reportContent.innerHTML = `
                    <p>Точка отправки: ${result.origin}</p>
                    <p>Пункт назначения: ${result.destination}</p>
                    <p>Время прибытия: ${new Date(result.arrival_time).toLocaleString()}</p>
                    <p>Время отправки: ${new Date(result.departure_time).toLocaleString()}</p>
                    <p>Расстояние: ${result.distance}метров</p>
                    <p>Топливный расход: ${result.fuel_used.toFixed(3)} литров</p>
                `;
      document.getElementById('start').value = null
      document.getElementById('destination').value = null
    })
    .catch(error => {
      console.error('Произошла ошибка:', error);
    });
}

function fetchReport() {
  // Отправка GET-запроса для получения данных отчета
  fetch('http://localhost:8182/report', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Ошибка в запросе: ' + response.status);
      }
      return response.json(); // Парсинг ответа
    })
    .then(result => {
      console.log('Успешный ответ:', result);

      // Элемент, куда будет отображаться отчет
      const reportContent = document.getElementById('report-content');
      reportContent.innerHTML = ''; // Очистка содержимого

      // Заполнение отчета на основе полученных данных
      result.report.forEach((item, index) => {
        const reportItem = document.createElement('div');
        reportItem.innerHTML = `
          <p><strong>Запрос #${index + 1}</strong></p>
          <p>Расстояние: ${item.distance} м.</p>
          <p>Транспорт: ${item.transportMode}</p>
          <p>Расход топлива ${item.fuel_used.toFixed(3)} литров</p>
          <p>Время регистрации пути: ${new Date(item.created_at).toLocaleString()}</p>
          <hr>
        `;
        reportContent.appendChild(reportItem);
      });
    })
    .catch(error => {
      console.error('Произошла ошибка:', error);
    });
}
