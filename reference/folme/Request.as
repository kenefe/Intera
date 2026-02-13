/**
* @Request
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

	dynamic public class Request extends MovieClip{
		
		public static var STATUS = {
			WAITING:-1,
			PLAYING:0,
			COMPLETED:1
		}

		public var status = STATUS.WAITING;
		public var view = view;

		public var waitingTime = 0;

		public var aniRequest = {}

		public var eventRequests = {
			onUpdate:function(){},
			onComplete:function(){}
		}


		// 传入Request，拆分为多个AniRequest
		public function Request(_view,_state,_config){

			view = _view;

			// 初始化 state,config
			var state = _state || {};
			var config = _config || {};
			config.special = config.special || {};

			waitingTime = (config.delay || 0) * 1000;
			eventRequests.onUpdate = config.onUpdate || eventRequests.onUpdate;
			eventRequests.onComplete = config.onComplete || eventRequests.onComplete;

			for(var id in state)
				addAniRequest(_view,id,state[id],config,config.special[id]);

		}

		private function addAniRequest(_view,id,value,config,special){

			if(id=='tint' && value is Number) value = Folme.tint(value);

			if(special && (special is IForce || special is IEasing || special is Array)){
				special = {
					ease:special
				}
			}

			// ease优先级: special > 通用 > 默认(undefined)
			var ease = (special && special.ease) || config.ease;

			if(ease is Array) {}
			else if(ease) ease = [ease];
			else ease = [];

			var minVisibleChange = (special && special.minVisibleChange);
			var delay = (special && special.delay) || 0;

			var fromSpeed = special && special.fromSpeed;

			var easeCopy = copyEase(ease);

			var json = {
				delay:delay,
				ease:easeCopy,
				fromSpeed:fromSpeed,
				minVisibleChange:minVisibleChange,
				isImmediate:config.isImmediate,
				range:special && special.range,
				rangeType:special && special.rangeType,
				rangeExtra:special && special.rangeExtra,
				rangeEvent:special && special.rangeEvent
			};
			// trace('fromSpeed',json.fromSpeed);
			aniRequest[id] = new AniRequest(this,_view,id,value,json);
		}

		private function copyEase(ease){
			var easeCopy = [];
			for(var i=0;i<ease.length;i++)
				easeCopy.push(ease[i].clone())
			return easeCopy;
		}


	}
}