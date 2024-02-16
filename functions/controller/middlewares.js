const rateLimit = require('express-rate-limit');

//* 사용량 제한 미들웨어. 도스 공격 방지

const option = {
	windowMs: 60 * 1000, // 1분
	max: 10, // IP당 최대 10개의 요청을 허용합니다 (1 분 동안)
	// standardHeaders: true, // 헤더에 `RateLimit-*` 를 포함합니다
	// legacyHeaders: false, // `X-RateLimit-*` 헤더를 비활성화합니다.
  delayMs: 0,
  handler(req, res) {
    res.status(this.statusCode).json({
      code: this.statusCode, // 기본값 429
      message: '1분에 10 번만 요청할 수 있습니다.',
    });
  },
}

exports.apiLimiter = rateLimit(option);

// 모든 요청에 대해 ratelimit를 실행


  