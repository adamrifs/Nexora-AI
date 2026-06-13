const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({ margin: 50 });
const stream = fs.createWriteStream('Q3_Financial_Report_2026_Final.pdf');

stream.on('finish', () => {
  console.log('PDF fully written and flushed to disk successfully!');
});

doc.pipe(stream);

doc.fontSize(20).text('Acme Corp - Q3 2026 Business & Financial Report', { align: 'center' });
doc.moveDown(2);

doc.fontSize(16).text('1. Executive Summary', { underline: true });
doc.fontSize(12).text('Acme Corp faced a challenging third quarter in 2026. Overall revenue declined by 15% year-over-year, largely driven by supply chain disruptions in Southeast Asia and increased competition in the entry-level software market. However, our enterprise SaaS division showed unexpected resilience with a 8% growth, padding our bottom line.');
doc.moveDown(1.5);

doc.fontSize(16).text('2. Financial Overview', { underline: true });
doc.fontSize(12).text('- Total Revenue: $42.5 Million (Down 15% YoY)');
doc.text('- Operating Expenses: $31.2 Million (Up 4% YoY)');
doc.text('- Net Income: $8.1 Million (Down 22% YoY)');
doc.text('- Cash Reserves: $120 Million');
doc.moveDown(1.5);

doc.fontSize(16).text('3. Key Risks Identified', { underline: true });
doc.fontSize(12).text('A major risk facing the company is the launch of "NovaLite", a cheaper alternative product by our main competitor, TechNova. We have already seen a 5% churn rate in our SMB client base this quarter due to this. Additionally, relying on a single logistics partner in Taiwan has proven risky, as recent typhoons delayed shipments of our hardware division by over 3 weeks.');
doc.moveDown(1.5);

doc.fontSize(16).text('4. Strategic Opportunities', { underline: true });
doc.fontSize(12).text('Despite the headwinds, there are clear opportunities. The European market (specifically Germany and France) is showing high demand for our Enterprise Data Compliance tools, representing a $50M untapped market. Furthermore, integrating generative AI into our existing CRM product could allow us to increase our premium subscription price by 15%, as beta testers reported a 30% increase in sales team productivity.');
doc.moveDown(1.5);

doc.fontSize(16).text('5. Next Steps', { underline: true });
doc.fontSize(12).text('1. Diversify hardware supply chain by onboarding a secondary logistics partner in Mexico by Q4.');
doc.text('2. Launch aggressive marketing campaign for the new AI CRM features.');
doc.text('3. Offer a temporary retention discount to SMB clients to counter TechNova\'s aggressive pricing.');

doc.end();
