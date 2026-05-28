package com.albasave.albasave_server.mentoring.domain.converter;

import com.albasave.albasave_server.mentoring.domain.DamageType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Converter
public class DamageTypeListConverter implements AttributeConverter<List<DamageType>, String> {
    @Override
    public String convertToDatabaseColumn(List<DamageType> attribute) {
        if (attribute == null || attribute.isEmpty()) return "";
        return attribute.stream().map(Enum::name).collect(Collectors.joining(","));
    }

    @Override
    public List<DamageType> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return new ArrayList<>();
        return Arrays.stream(dbData.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .map(s -> {
                    try { return DamageType.valueOf(s); }
                    catch (IllegalArgumentException e) { return null; }
                })
                .filter(d -> d != null)
                .collect(Collectors.toCollection(ArrayList::new));
    }
}
