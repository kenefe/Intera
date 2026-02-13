/**
* @Drag
* @author kenefe kenefe.li@gmail.com
* @version 3.0
*/
package com.kenefe.folme {
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;
	import flash.utils.*;
	import flash.system.System;

	public class FolmeDrag extends MovieClip {

		private var _view;
		private var _isVirtualView;


		private var _tracker = { x:new SpeedTracker(), y:new SpeedTracker() }
		// private var _needSmooth = false; // use .to instead of .setTo

		private var _ease = {}

		private var _getMouseX = function(){ return Folme.getMouseX() || 0; };
		private var _getMouseY = function(){ return Folme.getMouseY() || 0; };

		private var _hasStartBegin = false;

		private var _needRender = { x:false, y:false }
		private var _fromMouse = { x:0,y:0 }
		private var _from = { x:0,y:0 }
		private var _range = {
			x:[-Infinity,Infinity],
			y:[-Infinity,Infinity]
		}
		private var _absorb = {
			x:[],
			y:[]
		}
		private var _overScroll = {
			x1:1,
			x2:1,			
			y1:1,
			y2:1
		}

		private var _onUpdateCallback = function(){}
		
		public function FolmeDrag(view = undefined){
			_view = view || new MovieClip();
			_isVirtualView = view?false:true;
			if(_isVirtualView) Folme.useAt(_view);
		}

		public function render(...args){
			_needRender.x = false;
			_needRender.y = false;
			args.forEach(function(item){
				if(item == 'x') _needRender.x = true;
				else if(item == 'y') _needRender.y = true;
			})
			return this;
		}
		public function range(id,min,max){
			if(id != 'x' && id !== 'y') return;
			if(min > max){
				var tmp = min;
				min = max;
				max = tmp;
			}
			_range[id] = [min,max];
			_needRender[id] = true;
			return this;
		}

		public function absorb(id,min=undefined,max=undefined){
			if(id != 'x' && id !== 'y') return;
			
			if(min === undefined || max === undefined) {
				_absorb[id] = [];
				return;
			}
			if(min > max){
				var tmp = min;
				min = max;
				max = tmp;
			}
			var hasOne = _absorb[id].filter(function(item){ return item[0] == min && item[1] == max}).length>0;
			if(!hasOne) _absorb[id].push([min,max]);
			return this;
		}

		public function overScroll(id,a,b = undefined){
			if(id != 'x' && id != 'y') return;
			if(b!==undefined){
				_overScroll[id+'1'] = a;
				_overScroll[id+'2'] = b;
			}
			else {
				_overScroll[id+'1'] = a;
				_overScroll[id+'2'] = a;
			}
			return this;
		}

		public function spring(damping=undefined,response=undefined){
			if(response) _ease.spring = FolmeEase.spring(damping,response);
			else delete _ease.spring;
			return this;
		}

		public function friction(friction = undefined){
			if(friction) _ease.friction = FolmeEase.friction(friction);
			else delete _ease.friction;
			return this;
		}

		// json can be {} or onUpdateFunction
		public function begin(json = undefined){

			if(json == undefined){}
			else if(json is Object){}
			else json = {
				onUpdate:json
			}

			json = json || {};

			cancel();
			end();

			_getMouseX = json.mouseX || _getMouseX;
			_getMouseY = json.mouseY || _getMouseY;
			_onUpdateCallback = json.onUpdate || function(){};
			// if(json.smooth !== undefined) _needSmooth = json.smooth;

			_hasStartBegin = true;

			_tracker.x.clear();
			_tracker.y.clear();

			if(_isVirtualView){
				_view.folme.cancel();
				_view.folme.setTo({ x:0,y:0 })
			}

			_from.x = _view.x;
			_from.y = _view.y;
			_fromMouse.x = _getMouseX();//_getMouseX() - _view.x;
			_fromMouse.y = _getMouseY();//_getMouseY() - _view.y;

			addEventListener('enterFrame',tick);
			return this;
		}

		public function cancel(){
			_hasStartBegin = false;
			if(_needRender.x) _view.folme.cancel('x');
			if(_needRender.y) _view.folme.cancel('y');
		}

		public function end(){
			_hasStartBegin = false;
			removeEventListener('enterFrame',tick);
			return this;
		}

		public function tick(e){
			if(!_hasStartBegin) return;

			var calOffset = {
				x:_getMouseX() - _fromMouse.x,
				y:_getMouseY() - _fromMouse.y
			};
			var calState = {
				x:_from.x + calOffset.x,
				y:_from.y + calOffset.y
			};

			// if(calState.x !== undefined){
				if(calState.x > _range.x[1]) calState.x = _range.x[1] + Folme.afterFrictionValue(calState.x - _range.x[1],1080)*_overScroll.x2;
				else if(calState.x < _range.x[0]) calState.x = _range.x[0] - Folme.afterFrictionValue(_range.x[0] - calState.x,1080)*_overScroll.x1;
			// }

			// if(calState.y !== undefined){
				if(calState.y > _range.y[1]) calState.y = _range.y[1] + Folme.afterFrictionValue(calState.y - _range.y[1],2340)*_overScroll.y2;
				else if(calState.y < _range.y[0]) calState.y = _range.y[0] - Folme.afterFrictionValue(_range.y[0] - calState.y,2340)*_overScroll.y1;
			// }

			var state = {};
			if(_needRender.x) state.x = calState.x;
			if(_needRender.y) state.y = calState.y;

			_tracker.x.update(calState.x);
			_tracker.y.update(calState.y);
			
			_view.folme.setTo(state);

			if(_onUpdateCallback)
				_onUpdateCallback(
					calState.x,calState.y,
					calState.x-_from.x,calState.y-_from.y,
					_tracker.x.speed,
					_tracker.y.speed
				);
			
		}

		public function scroll(json = undefined){

			json = json || {};

			var state = {};
			if(_needRender.x) state.x = 0;
			if(_needRender.y) state.y = 0;


			var aniX = Folme.getAni(_view,'x');
			var aniY = Folme.getAni(_view,'y');

			var predictX = aniX.getPredict();
			var predictY = aniY.getPredict();

			var targetX = _needRender.x?fixPredict('x',predictX):undefined;
			var targetY = _needRender.y?fixPredict('y',predictY):undefined;


			var config = {
				ease:_ease.friction || FolmeEase.friction(1/2.1),
				special:{
					x:{ range:_range.x },
					y:{ range:_range.y }
				},
				onUpdate:json.onUpdate,
				onComplete:json.onComplete
				// function(){
				// 	_view.folme.setTo(state,{
				// 		onUpdate:json.onUpdate,
				// 		onComplete:json.onComplete
				// 	});
				// }
			};

			if(targetX !== undefined){
				var newFrictionX = aniX.getFrictionTo(targetX);
				state.x = targetX;
				config.special.x.ease = 
					Math.abs(aniX.speed) < 1000 || newFrictionX <= 0 || newFrictionX > 1 ?
					(_ease.spring || FolmeEase.spring(1,0.4)) :
					FolmeEase.friction(newFrictionX);
			}
			else if(_needRender.x){
				if(predictX<=_range.x[0]) state.x = _range.x[0];
				else if(predictX>=_range.x[1]) state.x = _range.x[1];
			}
			
			if(targetY !== undefined){
				var newFrictionY = aniY.getFrictionTo(targetY);
				state.y = targetY;
				config.special.y.ease = 
					Math.abs(aniY.speed) < 1000 || newFrictionY <= 0 || newFrictionY > 1 ?
					(_ease.spring || FolmeEase.spring(1,0.4)) :
					FolmeEase.friction(newFrictionY);
			}
			else if(_needRender.y){
				if(predictY<=_range.y[0]) state.y = _range.y[0];
				else if(predictY>=_range.y[1]) state.y = _range.y[1];
			}


			if(json.special !== undefined){
				for(var i in json.special){
					config.special[i] = config.special[i] || {};
					for(var j in json.special[i]){
						config.special[i][j] = json.special[i][j];
					}
				}
			}

			_view.folme.to(state,config);
		}

		private function fixPredict(id,predict){
			var newPredict;
			if(predict>=_range[id][0] && predict <= _range[id][1]){
				_absorb[id].forEach(function(absorb){
					if(predict>=absorb[0] && predict<=absorb[1]){
						newPredict = predict > (absorb[0]+absorb[1])/2 ? absorb[1] : absorb[0];
					}
				})
				return newPredict;
			}
			else return undefined;
		}

		public function getPredict(id,friction = 1/2.1){
			if(id == 'x' || id == 'y') return Folme.getAni(_view,id).getPredict(friction);
		}

		public function getPredictEdge(id,_range){
			if(id!='x' && id!='y') return 0;
			var target = Folme.getAni(_view,id).getPredictEdge(_range);
			return target;
		}

		public function getPredictEdgeId(id,_range){
			if(id!='x' && id!='y') return 0;
			var target = Folme.getAni(_view,id).getPredictEdge(_range);
			for(var i = 0 ; i < _range.length;i++)
				if(_range[i] == target) return i;
			return 0;
		}

	}
}