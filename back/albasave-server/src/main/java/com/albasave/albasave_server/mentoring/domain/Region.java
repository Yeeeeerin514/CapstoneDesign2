package com.albasave.albasave_server.mentoring.domain;

/**
 * 시·도 단위 지역. 관할 노동지청이 다르므로 매칭에 중요.
 * 같은 시도 = 0, 인접 시도 = 0.5, 그 외 = 1 거리.
 */
public enum Region {
    SEOUL("서울특별시"),
    BUSAN("부산광역시"),
    DAEGU("대구광역시"),
    INCHEON("인천광역시"),
    GWANGJU("광주광역시"),
    DAEJEON("대전광역시"),
    ULSAN("울산광역시"),
    SEJONG("세종특별자치시"),
    GYEONGGI("경기도"),
    GANGWON("강원특별자치도"),
    CHUNGBUK("충청북도"),
    CHUNGNAM("충청남도"),
    JEONBUK("전북특별자치도"),
    JEONNAM("전라남도"),
    GYEONGBUK("경상북도"),
    GYEONGNAM("경상남도"),
    JEJU("제주특별자치도"),
    OTHER("기타");

    private final String label;

    Region(String label) { this.label = label; }
    public String label() { return label; }

    /**
     * 인접 지역 매핑 (지리적 인접 + 통근권 고려).
     * 노동청 관할 차원에서 가까운 지역으로 표시.
     */
    public boolean isAdjacent(Region other) {
        if (this == other) return false;
        return switch (this) {
            case SEOUL -> other == GYEONGGI || other == INCHEON;
            case INCHEON -> other == SEOUL || other == GYEONGGI;
            case GYEONGGI -> other == SEOUL || other == INCHEON || other == CHUNGNAM || other == GANGWON || other == CHUNGBUK;
            case BUSAN -> other == GYEONGNAM || other == ULSAN;
            case ULSAN -> other == BUSAN || other == GYEONGNAM || other == GYEONGBUK;
            case DAEGU -> other == GYEONGBUK || other == GYEONGNAM;
            case DAEJEON -> other == CHUNGNAM || other == CHUNGBUK || other == SEJONG;
            case SEJONG -> other == DAEJEON || other == CHUNGNAM || other == CHUNGBUK;
            case GWANGJU -> other == JEONNAM || other == JEONBUK;
            default -> false;
        };
    }
}
