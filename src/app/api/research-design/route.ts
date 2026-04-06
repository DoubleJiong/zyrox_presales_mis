import { NextRequest, NextResponse } from 'next/server';
import { SearchClient, Config } from 'coze-coding-dev-sdk';

const config = new Config();
const client = new SearchClient(config);

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    const response = await client.webSearch(query, 10, true);

    return NextResponse.json({
      success: true,
      summary: response.summary,
      results: response.web_items?.map((item) => ({
        title: item.title,
        url: item.url,
        snippet: item.snippet,
        siteName: item.site_name,
      })),
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}
