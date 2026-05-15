export interface SolidarityParticipant {
  userId: string;
  /** 익명 닉네임. */
  nickname: string;
  unpaidAmount: number;
  /** 어른(대표자) 여부. 체불액 최고액 자동 지정. */
  isLeader: boolean;
}

export interface SolidarityGroup {
  workplaceId: string;
  workplaceName: string;
  participants: SolidarityParticipant[];
  totalUnpaidAmount: number;
}
