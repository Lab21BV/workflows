/**
 * Betalingen — uit module `Betalingen` (data/zoho/Betalingen.json).
 */

export const BETALING_TYPE = ["Vooruit", "Rest", "Volledig"] as const;
export type BetalingType = (typeof BETALING_TYPE)[number];

export const BETALING_KANAAL = ["Pinbetaling showroom", "iDeal", "Contant"] as const;
export type BetalingKanaal = (typeof BETALING_KANAAL)[number];
