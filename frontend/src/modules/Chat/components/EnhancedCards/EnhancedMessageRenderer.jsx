import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CompanyOverviewCard, SWOTCard, ComparisonTable, MarketMetricsCard, SourcesCard, CompanyContactCard } from './EnhancedCards';
import { MediaGallery } from './MediaGallery';
import { RisksCard, OpportunitiesCard } from './DocumentCards';
import ReportLoader from './ReportLoader';

// Simple helper to extract content between XML tags
const extractTag = (text, tag) => {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
};

// Advanced helper for tags containing multiple items (like comparison or sources)
const extractItems = (text, parentTag, itemTag) => {
  const parentContent = extractTag(text, parentTag);
  if (!parentContent) return [];
  
  const items = [];
  const regex = new RegExp(`<${itemTag}>([\\s\\S]*?)</${itemTag}>`, 'gi');
  let match;
  while ((match = regex.exec(parentContent)) !== null) {
    items.push(match[1].trim());
  }
  return items;
};

const EnhancedMessageRenderer = ({ content, isStreaming = false, onSendMessage }) => {
  // Detect if the AI is generating a structured company report
  const isReport = content?.includes('Business Report') || content?.includes('Executive Summary');

  // If streaming a report, hide the raw markdown and show a sleek inline loader
  if (isStreaming && isReport) {
    return <ReportLoader />;
  }

  const { cleanMarkdown, parsedData } = useMemo(() => {
    let markdown = content || '';
    const data = {};

    const firstTagIndex = markdown.search(/<(company_overview|swot|comparison|market_metrics|sources|company_contact|media_gallery|doc_risks|doc_opportunities|recommended_steps)>/i);
    
    let xmlSection = '';
    if (firstTagIndex !== -1) {
      xmlSection = markdown.substring(firstTagIndex);
      markdown = markdown.substring(0, firstTagIndex).trim();
    }

    // Parse Media Gallery
    const mediaItems = extractItems(xmlSection, 'media_gallery', 'image');
    if (mediaItems.length > 0) {
      data.media = mediaItems.map(imgStr => {
        let url = extractTag(imgStr, 'url');
        // Fallback: If no <url> tag exists, check if the content itself is a URL
        if (!url && imgStr.startsWith('http')) {
          url = imgStr;
        }
        return {
          url: url,
          title: extractTag(imgStr, 'title'),
          domain: extractTag(imgStr, 'domain')
        };
      }).filter(img => img.url); // filter out empty URLs
    }

    // Parse Company Contact
    const contactStr = extractTag(xmlSection, 'company_contact');
    if (contactStr) {
      data.contact = {
        company_name: extractTag(contactStr, 'company_name'),
        website: extractTag(contactStr, 'website'),
        location: extractTag(contactStr, 'location'),
        phone: extractTag(contactStr, 'phone'),
        email: extractTag(contactStr, 'email'),
        contact_page: extractTag(contactStr, 'contact_page'),
        linkedin: extractTag(contactStr, 'linkedin'),
        confidence: extractTag(contactStr, 'confidence')
      };
    }

    // Parse Company Overview
    const companyStr = extractTag(xmlSection, 'company_overview');
    if (companyStr) {
      data.company = {
        founded: extractTag(companyStr, 'founded'),
        headquarters: extractTag(companyStr, 'headquarters'),
        industry: extractTag(companyStr, 'industry'),
        website: extractTag(companyStr, 'website'),
        products: extractTag(companyStr, 'products')
      };
    }

    // Parse SWOT
    const swotStr = extractTag(xmlSection, 'swot');
    if (swotStr) {
      data.swot = {
        strengths: extractTag(swotStr, 'strengths'),
        weaknesses: extractTag(swotStr, 'weaknesses'),
        opportunities: extractTag(swotStr, 'opportunities'),
        threats: extractTag(swotStr, 'threats')
      };
    }

    // Parse Comparison
    const comparisonItems = extractItems(xmlSection, 'comparison', 'item');
    if (comparisonItems.length > 0) {
      data.comparison = comparisonItems.map(itemStr => ({
        feature: extractTag(itemStr, 'feature'),
        entity1: extractTag(itemStr, 'entity1'),
        entity2: extractTag(itemStr, 'entity2')
      }));
    }

    // Parse Market Metrics
    const marketStr = extractTag(xmlSection, 'market_metrics');
    if (marketStr) {
      data.market = {
        market_size: extractTag(marketStr, 'market_size'),
        growth_rate: extractTag(marketStr, 'growth_rate'),
        competitors: extractTag(marketStr, 'competitors'),
        trends: extractTag(marketStr, 'trends')
      };
    }

    // Parse Sources
    const sourceItems = extractItems(xmlSection, 'sources', 'source');
    if (sourceItems.length > 0) {
      data.sources = sourceItems.map(srcStr => ({
        name: extractTag(srcStr, 'name'),
        url: extractTag(srcStr, 'url')
      }));
    }

    // Parse Document Risks
    const riskItems = extractItems(xmlSection, 'doc_risks', 'risk');
    if (riskItems.length > 0) {
      data.docRisks = riskItems;
    }

    // Parse Document Opportunities
    const oppItems = extractItems(xmlSection, 'doc_opportunities', 'opportunity');
    if (oppItems.length > 0) {
      data.docOpportunities = oppItems;
    }

    // Parse Recommended Steps
    const recItems = extractItems(xmlSection, 'recommended_steps', 'step');
    if (recItems.length > 0) {
      data.recommendedSteps = recItems;
    }

    return { cleanMarkdown: markdown, parsedData: data };
  }, [content]);

  return (
    <div className="flex flex-col w-full gap-3">
      {/* 1. Enhanced UI Cards (Rendered above the text) */}
      <div className="flex flex-col gap-3 ml-2 mr-2">
        {parsedData.media && <MediaGallery data={parsedData.media} />}
        {parsedData.contact && <CompanyContactCard data={parsedData.contact} />}
        {parsedData.company && <CompanyOverviewCard data={parsedData.company} />}
        {parsedData.swot && <SWOTCard data={parsedData.swot} />}
        {parsedData.comparison && <ComparisonTable data={parsedData.comparison} />}
        {parsedData.market && <MarketMetricsCard data={parsedData.market} />}
      </div>

      {/* 2. Normal Conversational Markdown Bubble */}
      <div className="bg-white/80 backdrop-blur-xl text-gray-800 px-6 py-5 rounded-[2rem] rounded-tl-md shadow-[0_4px_24px_0_rgba(0,0,0,0.04)] border border-white min-w-0 prose prose-sm prose-p:leading-relaxed prose-a:text-blue-600 prose-headings:text-gray-900 prose-strong:text-gray-900 max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanMarkdown}</ReactMarkdown>
      </div>

      {/* 3. Sources & Document Cards (Kept at the bottom) */}
      <div className="flex flex-col gap-2 ml-2 mr-2">
        {parsedData.docRisks && <RisksCard risks={parsedData.docRisks} />}
        {parsedData.docOpportunities && <OpportunitiesCard opportunities={parsedData.docOpportunities} />}
        {parsedData.sources && <SourcesCard data={parsedData.sources} />}
      </div>

      {/* 4. Recommended Steps (at the very bottom) */}
      {parsedData.recommendedSteps && parsedData.recommendedSteps.length > 0 && !isStreaming && (
        <div className="flex flex-wrap gap-2 mt-1 ml-2 mr-2">
          {parsedData.recommendedSteps.map((step, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage && onSendMessage(step)}
              className="px-4 py-2 bg-white/70 hover:bg-[#8C52FF] border border-[#8C52FF]/30 text-[#8C52FF] hover:text-white text-sm font-medium rounded-full transition-all text-left shadow-sm hover:shadow-md animate-fade-in"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {step}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnhancedMessageRenderer;
