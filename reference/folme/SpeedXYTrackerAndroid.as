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

	public class SpeedXYTrackerAndroid extends MovieClip {

		private var history = [];
		private var minValidTime = 30;
		private var maxValidTime = 100;

		public function update(x,y,time = undefined){
			time = time || _getCurrentTime();
			history.push({
				x:x,y:y,time:time,
				delta: {
					x: history.length ? x - history[history.length - 1].x : 0,
					y: history.length ? y - history[history.length - 1].y : 0
				}
			});
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
			trace('calVelocity');
			var velocity = {
				x: calSingleVelocity(history,'x'),
				y: calSingleVelocity(history,'y')
			};
			return velocity;
		}

		private function calSingleVelocity(history,property){
				trace('calSingleVelocity',property,history.length);

				var arr = [];
				var speed = 0;
				if(history.length>=1){

					arr = [];

					var _assumePointerMoveStoppedMilliseconds = 40;
					var _horizonMilliseconds = 100;
					
					var newestSample = history[history.length-1];
					//var previousSample = newestSample;
					//var oldestSample = newestSample;
					
					for(var i=history.length-1;i>=1;i--){
						var sample = history[i];
						var previousSample = history[i-1];
						var age = Math.abs(newestSample.time - sample.time);
						var delta = (sample.time - previousSample.time);
						var value = (sample.delta[property]) / delta;

						// previousSample = sample;			
						trace('age',age,_horizonMilliseconds,'delta',delta,_assumePointerMoveStoppedMilliseconds);

						if(age > _horizonMilliseconds || delta >  _assumePointerMoveStoppedMilliseconds){
							continue;
						}

						//oldestSample = sample;
						arr.push({x:-age,y:value});
					}

					var sum = 0;
					arr.forEach(function(item){
						sum+=item.y;
					})
					sum/=arr.length;

					if(arr.length > 2){
						var lsq = linearRegression(arr);
						var tmpSpeed = lsq.solve(2);
						// trace('#a:',lsq.a,'#b:',lsq.b,tmpSpeed);
						if(sum>0 && tmpSpeed<0) tmpSpeed = 0;
						else if(sum<0 && tmpSpeed>0) tmpSpeed = 0;
						// if(lsq.a<0 && lsq.b>0) tmpSpeed = Math.max(0,tmpSpeed);
						// else if(lsq.a>0 && lsq.b<0) tmpSpeed = Math.min(0,tmpSpeed);
						speed = tmpSpeed * 1000;
					}
					else if(arr.length == 2) speed = arr[0].delta[property];
					else speed = 0;
				}
				else speed = 0;

				return speed;
		}

		private function linearRegression(data){
			var xsum=0;//x的多项和
			var ysum=0;//y的多项和
			var i;
			for(i=0;i<data.length;i++){
				xsum+=data[i].x;
				ysum+=data[i].y;
			}
			var xmean=xsum/data.length;//x的平均数
			var ymean=ysum/data.length;//y的平均数
			var num=0;//多项式和【(x-x的均值)*(y-y的均值)】
			var den=0;//多项式和【(x-x的均值)*(x-x的均值)】
			for(i=0;i<data.length;i++){
				var x=data[i].x;
				var y=data[i].y;
				num+=(x-xmean)*(y-ymean);
				den+=(x-xmean)*(x-xmean);
			}
			var a=num/den;//y=ax+b 的 系数a
			var b=ymean-a*xmean;//y=ax+b 的 系数b
			return {
				a:a,
				b:b,
				solve:function(x){return y = a*x+b;}
			}
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