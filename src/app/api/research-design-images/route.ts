import { NextRequest, NextResponse } from 'next/server';
import { SearchClient, Config } from 'coze-coding-dev-sdk';

const config = new Config();
const client = new SearchClient(config);

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    const response = await client.imageSearch(query, 20);

    return NextResponse.json({
      success: true,
      results: response.image_items?.map((item) => ({
        title: item.title,
        url: item.image.url,
        source: item.site_name,
        width: item.image.width,
        height: item.image.height,
      })),
    });
  } catch (error) {
    console.error('Image search error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}
