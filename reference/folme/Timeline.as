/**
* @Timeline
* @author kenefe kenefe.li@gmail.com
* @version 3.0
*/
package com.kenefe.folme {
	import flash.display.*;
	import flash.events.*;
	import flash.text.*;
	import flash.utils.*;
	import flash.system.*;
	
	import com.kenefe.*;

	public class Timeline extends MovieClip{

		public static var tl:Shape = new Shape();

		public static var _frameRate;
		private static var _timeScale = 1;

		public static var currentTime = 0;
		public static var deltaTime;

		private static var _stage;

		public static var _requests = new LinkArray();

		public function Timeline(){
			deltaTime = getDeltaTime();
			tl.addEventListener(Event.ENTER_FRAME,ticker);
		}

		public static function setFrameRate(val){
			_frameRate = val;
		}

		public static function setTimeScale(val){
			_timeScale = val;
		}

		private function getFrameRate(){
			// 优先级：手动设置 > 绑定stage > 60

			var fr = 60;

			if(_frameRate != undefined) fr = _frameRate;
			else if(LocalDevice.isAndroid() && Folme && Folme.getStage()) fr = Folme.getStage().frameRate;
			
			return fr;
			// return _frameRate || (Folme && Folme.getStage()) ? Folme.getStage().frameRate : 60;
		}

		private function getDeltaTime(){
			var deltaTime = 1000 / getFrameRate();
			deltaTime /= _timeScale;
			return deltaTime;
		}


		private function ticker(...args){
			deltaTime = getDeltaTime();
			currentTime += deltaTime;
			runRequests();
		}

		private static function runRequests(){

			if(_requests.length == 0) return;

			_requests.forEach(function(request){

				// request: remove completed requests
				if(request.status == Request.STATUS.COMPLETED) {
					_requests.remove(request);
					for(var i in request.aniRequest)
						request.aniRequest[i] = null;
					request.aniRequest = null;
					request = null;
					return;
				}


				// request: move WAITING to PLAYING
				if(request.status == Request.STATUS.WAITING){
					request.waitingTime -= deltaTime;
					if(request.waitingTime <= 0)
						request.status = Request.STATUS.PLAYING;
				}

			})

			_requests.forEach(runRequest);
		}

		private static function runRequest(request){

			var hasStopped = false;
			var hasStarted = false;

			// request: PLAYING
			if(request.status == Request.STATUS.PLAYING){

				var isAllCompleted = true;
				for(var j in request.aniRequest){

					var aniRequest = request.aniRequest[j];

					// 检查是否有被中断
					if(!aniRequest || aniRequest.status == AniRequest.STATUS.STOPPED){
						hasStopped = true;
						aniRequest = null;
						continue;
					}

					// aniRequst: move WAITING to PLAYING
					if(aniRequest.status == AniRequest.STATUS.WAITING){
						aniRequest.waitingTime -= deltaTime;
						if(aniRequest.waitingTime <= 0){
							aniRequest.status = AniRequest.STATUS.PLAYING;
							aniRequest.onBegin();
						}
					}

					// aniRequest: PLAYING
					if(aniRequest.status == AniRequest.STATUS.PLAYING){
						aniRequest.onUpdate(deltaTime);
						aniRequest.onRender();
					}

					// 检查是否全部结束
					if(
						aniRequest.status == AniRequest.STATUS.WAITING || 
						aniRequest.status == AniRequest.STATUS.PLAYING
					) 
						isAllCompleted = false;
					
					if(
						aniRequest.status == AniRequest.STATUS.PLAYING ||
						aniRequest.status == AniRequest.STATUS.COMPLETED
					)
						hasStarted = hasStarted || true;

				}


				// 回调onUpdate
				if(hasStarted) request.eventRequests.onUpdate();

				// 全部结束，状态切换为COMPLETED
				if(isAllCompleted) request.status = Request.STATUS.COMPLETED;

			}


			// 回调onComplete
			if(request.status == Request.STATUS.COMPLETED){
				if(!hasStopped) request.eventRequests.onComplete();
			}
		}

		public static function addRequest(view,state,config){
			var request = new Request(view,state,config);
			if(config && config.isImmediate){
				request.status = Request.STATUS.PLAYING;
				runRequest(request);
			}
			else _requests.add(request);
		}

		public static function clearWaitingRequest(view){
			_requests.forEach(function(request){
				if(
					request.view == view &&
					(request.status == Request.STATUS.WAITING || request.status == Request.STATUS.PLAYING)
				){
					for(var i in request.aniRequest){
						if(request.aniRequest[i].status == AniRequest.STATUS.WAITING)
							request.aniRequest[i].status = AniRequest.STATUS.STOPPED;
					}
				}
			});
		}

	}
}