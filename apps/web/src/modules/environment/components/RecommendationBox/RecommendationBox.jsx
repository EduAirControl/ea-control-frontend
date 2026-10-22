import "./RecommendationBox.css";
import { IoBulbOutline } from 'react-icons/io5';

function RecommendationBox({ recommendations = [] }) {
  return (
    <section className="recommendation-box">
      <h3>
        <IoBulbOutline aria-hidden="true" /> Recomendaciones
      </h3>

      <ul>
        {recommendations.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default RecommendationBox;