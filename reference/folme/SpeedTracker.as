/**
 * @trackSpeed
 * @author kenefe kenefe.li@gmail.com
 * @version 1.1
 */
package com.kenefe.folme {
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;
	import flash.utils.*;
	import flash.system.System;

	public class SpeedTracker extends MovieClip {

		public var history = [];

		public var arr;

		private var _speed = 0;

		private var isSpeed = false;

	  private var stopWaitingTime = 50;

		public function SpeedTracker(json = undefined) {
			json = json || {};
			if (json.useTrend !== undefined)
				isSpeed = json.useTrend;
			else
				isSpeed = false;
		}

		public function update(val) {
			history.push({
				value: val,
				value2: history.length ? val - history[history.length - 1].value : 0,
				time: _getCurrentTime()
			})
      // while(history.length>10){
			// 	history.shift();
			// }
			updateSpeed();
		}
		public function clear() {
			history = [];
			_speed = 0;
		}
		private function updateSpeed() {

			_speed = calSpeed();

			function calSpeed() {
				var speed = null;
				if (history.length >= 2) {

					// 最后1个采样
					var lastTime = history[history.length - 1].time;
					var lastValue = history[history.length - 1].value;

					// 倒数第2个采样
					var lastTime1 = history[history.length - 2].time;
					var lastValue1 = history[history.length - 2].value;

					// 获取最后两个采样的速度方向
					var tmp1 = lastTime == lastTime1 ? 0 : (lastValue - lastValue1) / ((lastTime - lastTime1) / 1000);

					// 倒序遍历
					var tInfo,dt;
					for (var i = history.length - 1; i >= 0; i--) {
						tInfo = history[i];
						dt = lastTime - tInfo.time;

						// 只看30～100ms内的第一个数据
						if (dt > 10 && dt < 200) {

							// 该采样与最终点的方向
							var tmp2 = dt == 0 ? 0 : (lastValue - tInfo.value) / (dt / 1000);
							speed = tmp2;

							// 取方向一致的大值
							if (tmp1 * tmp2 > 0) {
								if (tmp2 > 0) speed = Math.max(tmp1, tmp2);
								else if (tmp2 < 0) speed = Math.min(tmp1, tmp2);
							}

							break;
						}

					}

					// 如果没有找到30ms~100ms内的采样，取100ms以外的和终点之间的速度
					if (speed == null) speed = dt == 0 ? 0 : (lastValue - tInfo.value) / (dt / 1000);

				} else speed = 0;
				return speed;
			}
			return 0;
		}


		public function get speed() {
			if (history.length > 0 && Math.abs(_getCurrentTime() - history[history.length - 1].time) > stopWaitingTime) return 0;
			return _speed;
		}
		public function set speed(val) {
			_speed = speed;
		}

		private function _getCurrentTime() {
			return (new Date()).getTime();
		}
	}
}