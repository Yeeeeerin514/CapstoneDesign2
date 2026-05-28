package com.albasave.albasave_server.lawapi.service;

import com.albasave.albasave_server.lawapi.dto.LawArticle;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 법령 조문을 의미 단위 청크로 분할.
 *
 * 전략:
 *  - 본문이 짧으면(<= 400자) 그대로 단일 청크 (partNo=0).
 *  - 길면 ①, ②, ③ ... 같은 항 표식으로 분할 (partNo=1~).
 *    각 항이 너무 짧으면 다음 항과 병합.
 *  - 각 청크에는 검색 정확도를 위해 헤더("근로기준법 제55조(휴일) — ...")를 본문 앞에 붙임.
 */
@Slf4j
@Service
public class LawChunkingService {

    /** 항 번호: ①~⑳, ⒈~⒛, 1.~20. 패턴 */
    private static final Pattern PARAGRAPH_MARK = Pattern.compile(
            "(?=[①-⑳⒈-⒛])|(?<=^|\\s)([0-9]{1,2})\\.(?=\\s)"
    );
    private static final int MIN_CHUNK_LENGTH = 80;
    private static final int SOFT_MAX_LENGTH = 600;

    /** 하나의 조문을 청크 리스트로 분할. */
    public List<Chunk> chunk(LawArticle article) {
        if (article == null || article.body() == null) return List.of();
        String body = article.body().replaceAll("\\s+", " ").trim();
        if (body.isBlank()) return List.of();

        String header = buildHeader(article);

        // 짧은 조문은 분할하지 않음
        if (body.length() <= SOFT_MAX_LENGTH) {
            return List.of(new Chunk(0, header + " — " + body));
        }

        // 항 단위 분할 시도
        List<String> parts = splitByParagraphMarks(body);

        // 결과가 너무 잘게 쪼개졌으면 인접 청크끼리 병합
        List<String> merged = mergeSmall(parts);

        if (merged.size() <= 1) {
            // 분할이 안 됐으면 길이 기준으로 강제 분할
            merged = splitByLength(body, SOFT_MAX_LENGTH);
        }

        List<Chunk> out = new ArrayList<>(merged.size());
        for (int i = 0; i < merged.size(); i++) {
            String content = header + " 제" + (i + 1) + "항 — " + merged.get(i);
            out.add(new Chunk(i + 1, content));
        }
        return out;
    }

    private String buildHeader(LawArticle a) {
        if (a.articleTitle() == null || a.articleTitle().isBlank()) {
            return a.lawName() + " 제" + a.articleNumber() + "조";
        }
        return a.lawName() + " 제" + a.articleNumber() + "조(" + a.articleTitle() + ")";
    }

    private List<String> splitByParagraphMarks(String body) {
        List<String> out = new ArrayList<>();
        Matcher m = PARAGRAPH_MARK.matcher(body);
        int prev = 0;
        while (m.find()) {
            if (m.start() > prev) {
                String piece = body.substring(prev, m.start()).trim();
                if (!piece.isBlank()) out.add(piece);
            }
            prev = m.start();
        }
        if (prev < body.length()) {
            String piece = body.substring(prev).trim();
            if (!piece.isBlank()) out.add(piece);
        }
        return out;
    }

    private List<String> mergeSmall(List<String> parts) {
        List<String> out = new ArrayList<>();
        StringBuilder buf = new StringBuilder();
        for (String p : parts) {
            if (buf.length() == 0) {
                buf.append(p);
            } else if (buf.length() < MIN_CHUNK_LENGTH) {
                buf.append(' ').append(p);
            } else {
                out.add(buf.toString());
                buf.setLength(0);
                buf.append(p);
            }
        }
        if (buf.length() > 0) out.add(buf.toString());
        return out;
    }

    private List<String> splitByLength(String body, int maxLen) {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < body.length(); i += maxLen) {
            out.add(body.substring(i, Math.min(i + maxLen, body.length())));
        }
        return out;
    }

    public record Chunk(int partNo, String content) {}
}
