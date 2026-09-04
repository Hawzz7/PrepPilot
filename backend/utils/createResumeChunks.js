export const createResumeChunks = (parsedResume) => {
  const chunks = [];

  // Summary
  if (parsedResume.summary) {
    chunks.push({
      type: "summary",
      text: parsedResume.summary,
    });
  }

  // Experience
  parsedResume.experience?.forEach((exp) => {
    chunks.push({
      type: "experience",
      text: `
Company: ${exp.company}

Role: ${exp.designation}

Duration: ${exp.duration}

${exp.description}
      `.trim(),
    });
  });

  // Projects
  parsedResume.projects?.forEach((project) => {
    chunks.push({
      type: "project",
      text: `
Project: ${project.title}

Description:
${project.description}

Technologies:
${project.technologies.join(", ")}
      `.trim(),
    });
  });

  // Skills
  if (parsedResume.skills?.length) {
    chunks.push({
      type: "skills",
      text: parsedResume.skills.join(", "),
    });
  }

  // Education
  parsedResume.education?.forEach((edu) => {
    chunks.push({
      type: "education",
      text: `
Degree: ${edu.degree}

Institution: ${edu.institution}

Year: ${edu.year}
      `.trim(),
    });
  });

  // Certifications
  parsedResume.certifications?.forEach((cert) => {
    chunks.push({
      type: "certification",
      text: `
${cert.title}

${cert.issuer || cert.institution}

${cert.year}
      `.trim(),
    });
  });

  return chunks;
};
