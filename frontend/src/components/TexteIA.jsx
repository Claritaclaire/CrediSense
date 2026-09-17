function rendreLigne(ligne, index) {
  const morceaux = ligne.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span key={index}>
      {morceaux.map((morceau, morceauIndex) => {
        const estGras = /^\*\*[^*]+\*\*$/.test(morceau);
        return estGras ? (
          <strong key={morceauIndex}>{morceau.slice(2, -2)}</strong>
        ) : (
          <span key={morceauIndex}>{morceau}</span>
        );
      })}
    </span>
  );
}

export default function TexteIA({ texte }) {
  return (
    <span className="whitespace-pre-wrap">
      {String(texte || "").split("\n").map((ligne, index) => (
        <span key={index}>
          {rendreLigne(ligne, index)}
          {index < String(texte || "").split("\n").length - 1 && <br />}
        </span>
      ))}
    </span>
  );
}
