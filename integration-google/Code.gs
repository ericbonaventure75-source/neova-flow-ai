// NEOVA : copier tout ce fichier dans Code.gs. Garder ce code privé.
const DESTINATAIRE = "neovaflowai@gmail.com";
const CLE_NEOVA = PropertiesService.getScriptProperties().getProperty('AUDIT_RELAY_KEY');

function testerEmail() {
  MailApp.sendEmail({to: DESTINATAIRE, subject: "NEOVA — Test des notifications", body: "La connexion Gmail fonctionne. Il reste à relier le site après le déploiement du script.", name: "NEOVA Flow AI"});
}

function doGet() {
  return reponse({ok: true, service: "NEOVA notifications"});
}

function doPost(e) {
  let verrou;
  try {
    const brut = e && e.postData && e.postData.contents;
    if (!brut || brut.length > 24000) return reponse({ok: false});
    const entree = JSON.parse(brut);
    if (!CLE_NEOVA) return reponse({ok: false});
    if (typeof entree.payload !== "string" || typeof entree.signature !== "string") return reponse({ok: false});
    const signature = Utilities.computeHmacSha256Signature(entree.payload, CLE_NEOVA, Utilities.Charset.UTF_8)
      .map(function(b) {return (b & 255).toString(16).padStart(2, "0");}).join("");
    if (signature !== entree.signature) return reponse({ok: false});
    const d = JSON.parse(entree.payload);
    if (!Number.isFinite(d.timestamp) || Math.abs(Date.now() - d.timestamp) > 300000) return reponse({ok: false});
    if (!/^[0-9a-f-]{36}$/i.test(d.id || "") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || "")) return reponse({ok: false});
    if (["name", "company", "sector", "need", "solution"].some(function(k) {return typeof d[k] !== "string" || !d[k].trim() || d[k].length > 5000;})) return reponse({ok: false});
    verrou = LockService.getScriptLock();
    if (!verrou.tryLock(5000)) return reponse({ok: false, retry: true});
    const cache = CacheService.getScriptCache();
    if (cache.get("audit:" + d.id)) return reponse({ok: true, duplicate: true});
    const heure = "volume:" + Math.floor(Date.now() / 3600000);
    const total = Number(cache.get(heure) || 0);
    if (total >= 20 || MailApp.getRemainingDailyQuota() < 1) return reponse({ok: false, retry: true});
    const reference = "NT-" + d.id.slice(0, 8).toUpperCase();
    const texte = ["Nouvelle demande d’audit gratuit", "Référence : " + reference, "Nom : " + d.name,
      "Entreprise : " + d.company, "E-mail : " + d.email, "Téléphone : " + (d.phone || "Non renseigné"),
      "Secteur : " + d.sector, "Solution : " + d.solution, "", "Besoin :", d.need,
      "", "Vous pouvez répondre à cet e-mail pour contacter le prospect."].join("\n");
    MailApp.sendEmail({to: DESTINATAIRE, replyTo: d.email, subject: "NEOVA — Demande audit " + reference,
      body: texte, name: "NEOVA Flow AI"});
    cache.put("audit:" + d.id, "sent", 21600);
    cache.put(heure, String(total + 1), 3600);
    return reponse({ok: true});
  } catch (erreur) {
    return reponse({ok: false, retry: true});
  } finally {
    if (verrou && verrou.hasLock()) verrou.releaseLock();
  }
}

function reponse(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet)).setMimeType(ContentService.MimeType.JSON);
}
