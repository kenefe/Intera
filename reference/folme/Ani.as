/**
* @Ani
* @author kenefe kenefe.li@gmail.com
* @version 3.0
*/
package com.kenefe.folme {

	import flash.display.*;
	import flash.events.*;
	import flash.text.*;
	import flash.utils.*;
	import flash.system.System;

	import com.kenefe.folme.force.*;

	public class Ani extends MovieClip{

		public static var STATUS = {
			PLAYING:0,
			STOPPED:1
		}

		public var value = 0;
		public var speed = 0;

		public var status = STATUS.STOPPED;

		public var minVisibleChange = 1e-4;

		public var aniRequest;

		public var forces = [];

		public var tracker = new SpeedTracker();

		private var preForceInfo;
		private var forceInfo;

		private function getForceInfo(){

			var immediateTarget;
			var forceTarget;
			var targetCount = 0;

			var hasAcceleration = false;
			var hasPerlin = false;

			var i,force;

			if(forces is IEasing) return { isEasing:true }

			// loop forces
			// 用for为了性能优化
			for(i = 0 ; i < forces.length;i++){
				force = forces[i];
				if(force is Immediate) { 
					immediateTarget = force.target;
					break;
				}
				else {
					if(force.target !== undefined){
						forceTarget = force.target;
						targetCount++;
					}
				}

				if(force is Acceleration) hasAcceleration = true;
				if(force is Perlin) hasPerlin = true;
			}

			return {
				isEasing:false,
				immediateTarget:immediateTarget,
				forceTarget:forceTarget,
				targetCount:targetCount,
				hasAcceleration:hasAcceleration,
				hasPerlin:hasPerlin
			}
		}

		public function next(deltaTime){

			// only run in PLAYING
			if(status == STATUS.STOPPED) return;

			var forceInfo = forceInfo;

			if(forceInfo.immediateTarget !== undefined){ // is immediate

				value = forceInfo.immediateTarget;
				tracker.update(value);

				speed = tracker.speed;

			}
			else { // update value with speed;

				if(forceInfo.isEasing){
					value = forces.getValue(deltaTime);
					speed = 0;
				}
				else {

					for(var i = 0 ; i < forces.length;i++){
						var force = forces[i];
						
						force.getValueAndSpeed(value,speed,forceInfo, preForceInfo);
						value = force.resultValue;//res[0];
						speed = force.resultSpeed;//res[1];
					}

				}

			}

		}

		public function nextFinish(){
			var forceInfo = forceInfo;
			if(forceInfo.immediateTarget !== undefined){ // is immediate
				status = STATUS.STOPPED;
			}
			else {
				if(forceInfo.isEasing){
					if(forces.progress >= 1){
						value = forces.toValue;
						status = STATUS.STOPPED;
					}
				}
				else {
					if(
						Math.abs(speed) < getMinVisibleSpeed() &&
						(forceInfo.targetCount==1?almost(value,forceInfo.forceTarget):true) && 
						!forceInfo.hasAcceleration && !forceInfo.hasPerlin
					){
						// （当只有一个force，且它有目标值）结束的时候，归到目标值
						if( forces.length == 1 && forces[0].target !== undefined ) 
							value = forces[0].target;

						status = STATUS.STOPPED;
					}
				}
			}
			// if(status == STATUS.STOPPED) forces = null; // gc
		}

		private function getMinVisibleSpeed(){
			// return minVisibleChange;
			if(minVisibleChange >= 1 ) return minVisibleChange;
			else return 1e-4;
		}

		private function almost(a,b){
			return Math.abs(a-b)<1e-3;
		}






		public function getPredict(friction = 1/2.1, lowSpeed = 1000){
			var restSpeed = getMinVisibleSpeed();
			if(speed * restSpeed < 0) restSpeed = -restSpeed;
			var dis = _getPredict(speed,friction) - _getPredict(restSpeed,friction);
			if(Math.abs(speed) < lowSpeed) dis = 0;
			return value + dis;
		}

		private function _getPredict(speed,friction = 1/2.1){
			var _dragLog = friction * -4.2;
			return - speed / _dragLog;
		}

		public function getFrictionTo(target, lowSpeed = 1000){
			var restSpeed = getMinVisibleSpeed();
			if(speed * restSpeed < 0) restSpeed = -restSpeed;

			var dis = target - value;
            if(Math.abs(speed) < lowSpeed || speed * dis <= 0) return -1; // 不是同一方向，直接放弃

			var f = -(speed - restSpeed) / dis;
			f /= -4.2; // 这就是传入的friction
			return f;
		}
		
		public function getPredictEdge(_range){

			var range = [].concat(_range);
			range.sort(function(a,b){ return a-b; })

			if(value<range[0]) return range[0];
			else if(value>range[range.length-1]) return range[range.length-1];
			else 
				for(var i = 1; i < range.length ; i++){
					if(value <= range[i]){
						if(speed > 1000) return range[i];
						else if(speed < -1000) return range[i-1];
						else if(value > (range[i] + range[i-1])/2 ) return range[i];
						else return range[i-1];
					}
				}

			return range[0];
		}






		public function updateForceInfo(){
			preForceInfo = forceInfo;
			forceInfo = getForceInfo();
		}





	}
}