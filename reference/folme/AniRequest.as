/**
* @AniRequest
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

	public class AniRequest extends MovieClip{
		
		public static var aniRequestCount = 0;

		public static var STATUS = {
			WAITING:-1,
			PLAYING:0,
			COMPLETED:1,
			STOPPED:2
		}

		public static var RANGE_TYPE = {
			CUSTOM:-1,
			STOP:0,
			OVERSHOOT:1,
			REBOUND:2
		}

		public var status = STATUS.WAITING;

		public var request;
		public var view;
		public var id;
		private var ani;
		
		public var target = 0;
		public var config;
		public var waitingTime = 0;


		public var range = [-Infinity,Infinity];
		public var rangeType = RANGE_TYPE.OVERSHOOT;
		public var rangeExtra = [];
		public var customRangeEvent = function(value,speed){}


		public function AniRequest(_request,_view,_id,_target,_config){
			request = _request;
			view = _view;
			id = _id;
			target = _target;
			config = _config;
			waitingTime = config.delay * 1000;
			if(config.range !== undefined) range = config.range;
			if(config.rangeType !== undefined) rangeType = config.rangeType;
			if(config.rangeExtra !== undefined) rangeExtra = config.rangeExtra;
			
		}


		public function onBegin(){
			ani = Folme.getAni(view,id);
			// var ani = Folme.getAni(view,id);

			// aniRequest 状态更新：

			// stop current ani
			ani.status = Ani.STATUS.STOPPED;
			if(ani.aniRequest){
				ani.aniRequest.status = AniRequest.STATUS.STOPPED;
				ani.aniRequest = null;
			}

			// setup all config
			ani.aniRequest = this;


			var fromValue = 0;
			var toValue = 1;

			if(id == 'tint'){
				fromValue = 0;
				toValue = 1;
				
				setupTint(target is Tint ? target : Folme.tint(target,1));

			}
			else {
				if(id == 'frame') fromValue = view.currentFrame;
				else fromValue = view[Folme.getSaveId(id)] || 0;
				toValue = target;
			}


			ani.value = fromValue;
			ani.minVisibleChange = config.minVisibleChange || getMinVisibleChange(id);


			setForces(config.isImmediate?[FolmeEase.immediate()]:config.ease,fromValue,toValue);

			if(config.fromSpeed !== undefined) ani.speed = config.fromSpeed;


			// play it
			ani.status = Ani.STATUS.PLAYING;

		}


		private function setForces(forces,fromValue,toValue){

			// var ani = Folme.getAni(view,id);
			if(ani.forces) ani.forces = null;
			
			ani.forces = forces;
			if(ani.forces.length == 0) ani.forces = [ getDefaultEase() ]

			var hasImmediate = false;
			var hasInterpolator = false;
			var interpolator;


			var force;
			for(var j = 0; j < ani.forces.length;j++){
				force = ani.forces[j];
				if(force is Immediate) hasImmediate = true;
				if(force is IEasing) { hasInterpolator = true; interpolator = force; }
				if(force.target !== undefined){ force.target = toValue; }
			}

			// var filterImmediate = ani.forces.filter(function(item){ return item is Immediate; });
			// var filterInterpolator = ani.forces.filter(function(item){ return item is IEasing; });


			// 如果是插值器，ani.forces=插值器；如果是物理动画，ani.forces是数组

			// 插值器
			if(hasInterpolator && !hasImmediate){
				ani.forces = interpolator;//filterInterpolator[0];
				ani.forces.fromValue = fromValue;
				ani.forces.toValue = toValue;
			}
			// 物理
			else {

				// 默认曲线
				// if(ani.forces.length == 0) ani.forces = [ getDefaultEase() ]

				// // 配置目标值（如果需要的话）
				// for(var i=0;i<ani.forces.length;i++){
				// 	var force = ani.forces[i];
				// 	if(force.target !== undefined) force.target = toValue;
				// }
			}
			
			ani.updateForceInfo();

			// forces = null; // gc

		}



		public function onRender(){
			// var ani = Folme.getAni(view,id);
			var value = ani.value;
			renderView(id,value);
		}


		public function onUpdate(deltaTime){

			if(status != STATUS.PLAYING) return;

			// var ani = Folme.getAni(view,id);
			ani.next(deltaTime)

			if(ani.forces is IEasing){}
			else checkRange();

			ani.nextFinish();
			
			// (自动判停) 动画结束了，aniRequest就完成了
			if(ani.status == Ani.STATUS.STOPPED) status = STATUS.COMPLETED;

		}


		private function checkRange(){

			// var ani = Folme.getAni(view,id);

			// 保证 range = [min,max]
			if(range[0] > range[1]) range = range.reverse();

			// 超出边界
			if(ani.value < range[0] || ani.value > range[1]){
				var rangeValue = ani.value < range[0] ? range[0] : range[1];

				switch(rangeType){
					case RANGE_TYPE.STOP:
						ani.value = rangeValue;
						ani.speed = 0;
					break;
					case RANGE_TYPE.OVERSHOOT:
						setForces([
							rangeExtra.length == 2?
								FolmeEase.spring(rangeExtra[0],rangeExtra[1]):
								// (Math.abs(ani.speed)<1000?FolmeEase.spring(1,0.6):FolmeEase.spring(1,0.6))
								(Math.abs(ani.speed)<1000?FolmeEase.spring(1,0.3):FolmeEase.spring(1,0.4))
						],0,rangeValue);
						range = [-Infinity,Infinity];
					break;
					case RANGE_TYPE.REBOUND:
						ani.value = rangeValue;
						ani.speed = -ani.speed * ( rangeExtra.length==1 ? rangeExtra[0] : 1 );
					break;
					case RANGE_TYPE.CUSTOM:
						customRangeEvent(ani);
					break;
				}
			}

		}



		private function getDefaultEase(){

			return FolmeEase.spring(0.95,0.35); // 禁止动态曲线

			var aniX = Folme.getAni(view,'x');
			var aniY = Folme.getAni(view,'y');

			var speed = Math.sqrt(aniX.speed * aniX.speed + aniY.speed * aniY.speed);

			var defaultPositionEase = Math.abs(speed) < 1000? 
				FolmeEase.spring(1,0.4):
				FolmeEase.spring(0.8,0.5);

			return id == 'x' || id == 'y'? defaultPositionEase : FolmeEase.spring(0.9,0.3);
		}




		private function getMinVisibleChange(id){

			switch(id){
				case 'x':
				case 'y':
				case 'z':
				case 'width':
				case 'height':
					return 1;
				case 'scaleX':
				case 'scaleY':
					return 2*1e-3;
				case 'rotation':
				case 'rotationX':
				case 'rotationY':
				case 'rotationZ':
					return 1*1e-1;
				case 'blur':
				case 'alpha':
				case 'autoAlpha':
					return 3*1e-3;
				case 'tint':
					return 1e-1;
			}
			return 1e-3;
		}
		
		private function renderView(id,value){
			if(id == 'autoAlpha'){
				if(view.alpha != value) view.alpha = value;
				if(view.visible != view.alpha>0) view.visible = view.alpha>0;
			}
			else if(id == 'tint'){
				view.folme._tint.progress = value;
				renderTint();
			}
			else if(id == 'frame'){
				view.gotoAndStop(Math.round(value));
			}
			else {
				if(view[id]!=value) view[id] = value;
			}
		}








		// tint
		private function renderTint(){
			var fromCT = view.folme._tint.fromTint;
			var toCT = view.folme._tint.toTint;
			
			var per = view.folme._tint.progress;
			per = Math.max(0,per);
			per = Math.min(1,per);

			var ct = view.transform.colorTransform;
			var props = ["redMultiplier","greenMultiplier","blueMultiplier","alphaMultiplier","redOffset","greenOffset","blueOffset","alphaOffset"];
			props.forEach(function(prop,i){
				ct[prop] = Folme.valFromPer(per,fromCT[prop],toCT[prop])
			})
			ct.alphaMultiplier = view.alpha;
			ct.alphaOffset = view.alpha;

			view.transform.colorTransform = ct;
		}

		private function setupTint(tint){
			view.folme._tint = view.folme._tint || {};

			view.folme._tint.fromTint = view.transform.colorTransform;

			var ct = Tint.tintToColorTransform(tint.tint,tint.tintAmount);
			ct.alphaOffset = view.transform.colorTransform.alphaOffset;
			ct.alphaMultiplier = view.transform.colorTransform.alphaMultiplier;
		 	view.folme._tint.toTint = ct;

			view.folme._tint.progress = 0;

		}

	}
}