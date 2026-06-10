// ============================================================
// ChampIndex — Avertissements de sécurité OBLIGATOIRES
// ============================================================

export default function SafetyWarning() {
  return (
    <div className="mt-6 space-y-3">
      {/* Avertissement principal */}
      <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
        <div className="flex gap-3">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-bold text-red-300 mb-2">AVERTISSEMENT IMPORTANT</p>
            <p className="text-xs text-red-200/80 leading-relaxed">
              ChampIndex est un outil d'aide à la décision basé sur la météo et la topographie.
              Il ne permet PAS d'identifier les champignons.
            </p>
            <ul className="text-xs text-red-200/70 mt-2 space-y-1 list-disc list-inside">
              <li>Ne consommez JAMAIS un champignon non identifié à 100%</li>
              <li>Faites TOUJOURS vérifier votre récolte par un pharmacien ou mycologue</li>
              <li>Les applications d'identification par photo sont fortement déconseillées par l'ONF</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Centres antipoison */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
        <p className="text-xs font-semibold text-white/60 mb-2">
          🏥 En cas d'intoxication : appelez le 15 (SAMU)
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs text-white/50">
          <p>Paris: <span className="text-white/70">01 40 05 48 48</span></p>
          <p>Lyon: <span className="text-white/70">04 72 11 69 11</span></p>
          <p>Marseille: <span className="text-white/70">04 91 75 25 25</span></p>
          <p>Bordeaux: <span className="text-white/70">05 56 96 40 80</span></p>
        </div>
      </div>

      {/* Réglementation */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
        <p className="text-xs font-semibold text-white/60 mb-2">📋 Réglementation</p>
        <ul className="text-xs text-white/50 space-y-1">
          <li>• Limite : 5 litres/personne/jour en forêt publique (variable selon département)</li>
          <li>• Les champignons appartiennent au propriétaire du terrain (art. 547 Code civil)</li>
          <li>• Forêt privée : autorisation obligatoire du propriétaire</li>
          <li>• Amendes : 750€ à 45 000€ selon la quantité</li>
          <li>• Interdit d'utiliser pioche ou râteau</li>
          <li>• Utilisez un panier en osier (pas de sac plastique)</li>
        </ul>
      </div>
    </div>
  );
}
