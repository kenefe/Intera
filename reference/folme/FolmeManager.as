/**
* @FolmeManager
* @author kenefe kenefe.li@gmail.com
* @version 3.0
*/
package com.kenefe.folme {
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;
	import flash.utils.*;
	import flash.system.System;
	import com.kenefe.*;

	dynamic public class FolmeManager{

		private var _view;

		private var _anis = {}

		public var drag;
		public var sugar;

		// manage folme with view
		public function FolmeManager(view,viewType = undefined){
			_view = view;
			sugar = new Sugar(view,viewType);
			sugar.mouse().setAlpha(view.alpha,Folme.SUGAR_EVENT_MOUSE_UP);
			sugar.visible().setAlpha(view.alpha,Folme.SUGAR_EVENT_SHOW);
			drag = new FolmeDrag(view);
		}

		// 根据属性获取Ani，没有就创建一个
		public function getAni(id){

			// 不同的属性，同样的效果，防止冲突
			id = Folme.getSaveId(id);

			if(!_anis[id]) _anis[id] = new Ani();
			
			return _anis[id];
		}



		// (state)
		// (state,config)
		// ('x',120)
		// ('x',120,config)
		// ('DOWN')
		// ('DOWN',config)
		private function manageStateConfig(a,b = undefined,c = undefined){
			var config,state,id;
			if(a is String){
				if(b is Number){ // 'x',120
					state = {};
					state[a] = b;
					config = {
						special:{}
					};
					if(c){
						config.special[a] = c;
						if(c.onUpdate) config.onUpdate = c.onUpdate;
						if(c.onComplete) config.onComplete = c.onComplete;
						delete config.special[a].onUpdate;
						delete config.special[a].onComplete;
					}
				}
				else if(b == undefined){ // ‘stateA'
					state = _view[a];
					config = {};
				}
				else if(b is Object){ // 'stateA',config
					state = _view[a];
					config = cloneConfig(b);
				}
				else throw Error('没有目标值');
			}
			else { // state,config
				state = a;
				config = b;
			}
			
			// scaleX,scaleY相同的时候，可以写成scale (对special的id有影响，暂时屏蔽)
			// if(state.scale != undefined){
			// 	if(state.scaleX == undefined) state.scaleX = state.scale;
			// 	if(state.scaleY == undefined) state.scaleY = state.scale;
			// 	delete state.scale;
			// }

			state = state || {};
			config = config || {};

			// 兼容 delay, ease, special, onUpdate, onComplete 写在 state
			var attrs = ['delay','ease','special','onUpdate','onComplete'];
			var newState = {};
			for(var i in state){
				if(attrs.indexOf(i)<0) newState[i] = state[i];
			}
			
			attrs.forEach(function(attr){
				if(state[attr] != undefined){
					if(config[attr] == undefined){
						config[attr] = state[attr];
					}
					// delete state[attr];
				}
			})

			return {
				state:newState,
				config:config
			}
		}

		private function cloneConfig(config){
			var tmp = {};
			for(var j in config){
				if(j=='special'){
					tmp.special = tmp.special || {};
					for(var k in config.special){
						if(config.special[k] is FolmeEase){
							tmp.special[k] = config.special[k];
						}
						else{
							tmp.special[k] = {};
							for(var t in config.special[k]){
								tmp.special[k][t] = config.special[k][t];
							}
						}
						tmp.special[k] = config.special[k];
					}
				}
				else tmp[j] = config[j];
			}
			return tmp;
		}

		public function to(a,b = undefined,c = undefined){
			var stateConfig = manageStateConfig(a,b,c);
			Timeline.addRequest(_view,stateConfig.state,stateConfig.config);
		}

		public function nearlySetTo(a,b = undefined,c = undefined){
			var stateConfig = manageStateConfig(a,b,c);
			var newConfig = { 
				ease:FolmeEase.springImpulse(0.86,0.15,1),
				onUpate:stateConfig.onUpate,
				onComplete:stateConfig.onComplete
			};
			Timeline.addRequest(_view,stateConfig.state,newConfig);
		}

		public function setTo(a,b = undefined,c = undefined){
			var stateConfig = manageStateConfig(a,b,c);
			stateConfig.config.isImmediate = true;
			Timeline.addRequest(_view,stateConfig.state,stateConfig.config);
		}

		// 暂停当前
		public function cancel(...args){

			// 不指定属性，则全部停止
			if(args.length == 0)
				for(var id in _anis) stopAni(_anis[id]);
			else 
				for(var i in args){
					stopAni( getAni(args[i]) );
				}

			function stopAni(ani){
				ani.status = Ani.STATUS.STOPPED;
				ani.speed = 0;
				if(ani.aniRequest) ani.aniRequest.status = AniRequest.STATUS.STOPPED;
			}
		}

		// 停止当前和以后
		// public function cancel(){
		// 	clear();
		// }

		// 暂停当前ani+清空delay队列
		public function clear(){
			cancel()
			clearDelay();
		}

		// 清空delay队列
		public function clearDelay(){
			Timeline.clearWaitingRequest(_view);
		}


		// mouse
		public function mouseDown(config = undefined){
			sugar.mouseDown(config);
		}
		public function mouseUp(config = undefined){
			sugar.mouseUp(config);
		}
		public function longClick(config = undefined){
			sugar.longClick(config);
		}

		public function setMouseDown(config = undefined){
			sugar.setMouseDown(config);
		}
		public function setMouseUp(config = undefined){
			sugar.setMouseUp(config);
		}
		public function setLongClick(config = undefined){
			sugar.setLongClick(config);
		}

		// visible
		public function show(config = undefined){
			sugar.show(config);
		}
		public function hide(config = undefined){
			sugar.hide(config);
		}

		public function setShow(config = undefined){
			sugar.setShow(config);
		}
		public function setHide(config = undefined){
			sugar.setHide(config);
		}

		// 配置sugar
		public function mouse(){
			return sugar.mouse();
		}
		public function visible(){
			return sugar.visible();
		}









		public function tint(_tint,_tintAmount = 1){
			return new Tint(_tint,_tintAmount);
		}


		private var _actions = {};

		public function click(func){
			if(func){
				_actions.click = func;
				new MouseAction({
					target: _view,
					onClick: function(e,touchInfo){
						func();
					}
				})
			}
			else if(_actions.click) _actions.click();
		}

	}
}