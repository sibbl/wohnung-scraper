'use strict';
angular.module('dataVis', [
  'ui-leaflet',
  'checklist-model',
  'ui.bootstrap',
  'rzModule',
])
.constant('Config', window.appConfig)
.run(['$rootScope', '$window', function($rootScope, $window) {
  angular.element($window).bind('load', () => {
    $rootScope.$broadcast('rzSliderForceRender');
  });
}]);