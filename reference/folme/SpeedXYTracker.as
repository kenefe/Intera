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

	public class SpeedXYTracker extends MovieClip {

		private var history = [];
		private var minValidTime = 30;
		private var maxValidTime = 100;

		public function update(x,y,time = undefined){
			time = time || _getCurrentTime();
			history.push({x:x,y:y,time:time});
		}

		private function calVel(from,to){
			var dt = to.time - from.time;
			var speedX = dt == 0 ? 0 : (to.x - from.x) / (dt / 1000);
			var speedY = dt == 0 ? 0 : (to.y - from.y) / (dt / 1000);
			return {
				x: speedX,
				y: speedY,
				directionX: speedX > 0 ? 1 : speedX < 0 ? -1 : 0,
				directionY: speedY > 0 ? 1 : speedY < 0 ? -1 : 0,
				distance: Math.sqrt(speedX*speedX + speedY*speedY)
			}
		}

		private function calVelocity(history){
			var velocity = {
				x: 0,
				y: 0
			};
			if (history.length >= 2) {

				var lastOne = history[history.length - 1];
				var lastTwo = history[history.length - 2];

				var lastVelocity = calVel(lastTwo,lastOne);
				velocity = lastVelocity;

				for(var i = history.length - 1; i >= 0; i--){
					var item = history[i];
					var deltaTime = lastOne.time - item.time;
					if(deltaTime > maxValidTime) break;
					if(deltaTime > minValidTime){

						var tmpVelocity = calVel(item,lastOne);
						if(
							velocity.directionX * tmpVelocity.directionX >= 0 && 
							velocity.directionY * tmpVelocity.directionY >= 0
						){
							if(tmpVelocity.distance > velocity.distance) velocity = tmpVelocity;
							break;
						}

					}
				}
			}
			return velocity;
		}

		public function clear(){
			history = [];
		}

		public function get speed(){
			return calVelocity(history);
		}

		private function _getCurrentTime() {
			return (new Date()).getTime();
		}
	}
}