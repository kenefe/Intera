package com.kenefe.folme {

	public class Interpolator {
		public static var linear = function(per){
			return per;
		}
		public static var quadOut = function(per){
			return getEaseRatio(per,1,1);
		}
		public static var quadIn = function(per){
			return getEaseRatio(per,2,1);
		}
		public static var quadInOut = function(per){
			return getEaseRatio(per,3,1);
		}
		public static var cubicOut = function(per){
			return getEaseRatio(per,1,2);
		}
		public static var cubicIn = function(per){
			return getEaseRatio(per,2,2);
		}
		public static var cubicInOut = function(per){
			return getEaseRatio(per,3,2);
		}
		public static var quartOut = function(per){
			return getEaseRatio(per,1,3);
		}
		public static var quartIn = function(per){
			return getEaseRatio(per,2,3);
		}
		public static var quartInOut = function(per){
			return getEaseRatio(per,3,3);
		}
		public static var quintOut = function(per){
			return getEaseRatio(per,1,4);
		}
		public static var quintIn = function(per){
			return getEaseRatio(per,2,4);
		}
		public static var quintInOut = function(per){
			return getEaseRatio(per,3,4);
		}
		public static var sinOut = function(per){
			var _HALF_PI = Math.PI/2;
			return Math.sin(per * _HALF_PI);
		}
		public static var sinIn = function(per){
			var _HALF_PI = Math.PI/2;
			return -Math.cos(per * _HALF_PI) + 1;
		}
		public static var sinInOut = function(per){
			return -0.5 * (Math.cos(Math.PI * per) - 1);
		}
		public static var expoOut = function(per){
			return 1 - Math.pow(2, -10 * per);
		}
		public static var expoIn = function(per){
			return Math.pow(2, 10 * (per - 1)) - 0.001;
		}
		public static var expoInOut = function(per){
			return ((per*=2) < 1) ? 0.5 * Math.pow(2, 10 * (per - 1)) : 0.5 * (2 - Math.pow(2, -10 * (per - 1)));
		}

		public static var android = function(per){
			var b1 = Bezier.easing(0.3,0,0.8,0.15);
			var b2 = Bezier.easing(0.05,0.7,0.1,1);
			return per <= 1/6 ? 
				b1(per/(1/6)) * 0.4 : 
				0.4 + b2((per-1/6)/(5/6)) * 0.6 ;
		}

		private static function getEaseRatio(p,_type,_power){
            var r = (_type == 1) ? 1 - p : (_type == 2) ? p : (p < 0.5) ? p * 2 : (1 - p) * 2;
            if (_power == 1) {
                r *= r;
            } else if (_power == 2) {
                r *= r * r;
            } else if (_power == 3) {
                r *= r * r * r;
            } else if (_power == 4) {
                r *= r * r * r * r;
            }
            return (_type == 1) ? 1 - r : (_type == 2) ? r : (p < 0.5) ? r / 2 : 1 - (r / 2)
		}

		public static var bezier = function(x1, y1, x2, y2){
			return function(per){
				var b = Bezier.easing(x1, y1, x2, y2);
				return b(per);
			}
		}
	}
}