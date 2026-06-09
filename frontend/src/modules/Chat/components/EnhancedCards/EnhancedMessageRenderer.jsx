import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CompanyOverviewCard, SWOTCard, ComparisonTable, MarketMetricsCard, SourcesCard, CompanyContactCard } from './EnhancedCards';
import { MediaGallery } from './MediaGallery';

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

const EnhancedMessageRenderer = ({ content }) => {
  const { cleanMarkdown, parsedData } = useMemo(() => {
    let markdown = content || '';
    const data = {};

    const firstTagIndex = markdown.search(/<(company_overview|swot|comparison|market_metrics|sources|company_contact|media_gallery)>/i);
    
    let xmlSection = '';
    if (firstTagIndex !== -1) {
      xmlSection = markdown.substring(firstTagIndex);
      markdown = markdown.substring(0, firstTagIndex).trim();
    }

    // Parse Media Gallery
    const mediaItems = extractItems(xmlSection, 'media_gallery', 'image');
    if (mediaItems.length > 0) {
      data.media = mediaItems.map(imgStr => ({
        url: extractTag(imgStr, 'url'),
        title: extractTag(imgStr, 'title'),
        domain: extractTag(imgStr, 'domain')
      }));
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

      {/* 3. Sources Card (Usually kept at the bottom for citation) */}
      <div className="flex flex-col gap-2 ml-2 mr-2">
        {parsedData.sources && <SourcesCard data={parsedData.sources} />}
      </div>
    </div>
  );
};

export default EnhancedMessageRenderer;
