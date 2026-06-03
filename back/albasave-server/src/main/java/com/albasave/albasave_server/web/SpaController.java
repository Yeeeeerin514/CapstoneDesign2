package com.albasave.albasave_server.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * SPA(Expo Router web, output=single) fallback.
 *
 * 확장자 없는 클라이언트 라우트(/login, /(tabs), /mentor-chat/123 등)를
 * index.html 로 forward 해 새로고침/딥링크에도 앱이 부팅되게 한다.
 *
 * - /api/** 는 @RestController 들이 더 구체적 매핑이라 우선 처리됨.
 * - 정적 파일(.js/.css/.ttf/.png 등 점 포함 경로)은 정적 핸들러가 처리(여기서 매칭 안 됨).
 */
@Controller
public class SpaController {

    @GetMapping(value = {
            "/",
            "/{p1:[^\\.]*}",
            "/{p1:[^\\.]*}/{p2:[^\\.]*}",
            "/{p1:[^\\.]*}/{p2:[^\\.]*}/{p3:[^\\.]*}",
            "/{p1:[^\\.]*}/{p2:[^\\.]*}/{p3:[^\\.]*}/{p4:[^\\.]*}"
    })
    public String forwardToSpa() {
        return "forward:/index.html";
    }
}
