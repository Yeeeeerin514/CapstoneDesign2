package com.albasave.albasave_server.contract.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.List;

/**
 * List&lt;DayOfWeek&gt; ↔ DB CSV String 변환기.
 * 예: [MONDAY, TUESDAY, FRIDAY] ↔ "MONDAY,TUESDAY,FRIDAY"
 *
 * 진정서 팀원이 LaborContract에서 List&lt;DayOfWeek&gt;로 바로 사용할 수 있게 한다.
 */
@Converter
public class WorkDayListConverter implements AttributeConverter<List<DayOfWeek>, String> {

    @Override
    public String convertToDatabaseColumn(List<DayOfWeek> attribute) {
        if (attribute == null || attribute.isEmpty()) return null;
        StringBuilder sb = new StringBuilder();
        for (DayOfWeek d : attribute) {
            if (sb.length() > 0) sb.append(',');
            sb.append(d.name());
        }
        return sb.toString();
    }

    @Override
    public List<DayOfWeek> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return new ArrayList<>();
        List<DayOfWeek> out = new ArrayList<>();
        for (String token : dbData.split(",")) {
            String t = token.trim();
            if (t.isEmpty()) continue;
            try {
                out.add(DayOfWeek.valueOf(t));
            } catch (IllegalArgumentException ignored) {
                // 잘못된 값은 무시
            }
        }
        return out;
    }
}
