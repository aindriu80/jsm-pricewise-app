import Product from '@/lib/models/product.model'
import { connectToDB } from '@/lib/mongoose'
import { scrapeAmazonProduct } from '@/lib/scraper'
import {
  getAveragePrice,
  getEmailNotifType,
  getHighestPrice,
  getLowestPrice,
} from '@/lib/utils'

export async function GET() {
  try {
    connectToDB()

    const products = await Product.find({})

    if (!products) throw new Error('No products found')

    // 1. Scrape Latest Product Details & Update DB
    const updatedProducts = await Promise.all(
      products.map(async (currentProduct) => {
        const scrapedProduct = await scrapeAmazonProduct(currentProduct.url)

        if (!scrapedProduct) throw new Error('No product found')

        const updatedPriceHistory: any = [
          ...currentProduct.priceHistory,
          { price: scrapedProduct.currentPrice },
        ]

        const product = {
          ...scrapedProduct,
          priceHistory: updatedPriceHistory,
          lowestPrice: getLowestPrice(updatedPriceHistory),
          highestPrice: getHighestPrice(updatedPriceHistory),
          averagePrice: getAveragePrice(updatedPriceHistory),
        }

        const updateProduct = await Product.findOneAndUpdate(
          {
            url: scrapedProduct.url,
          },
          product
        )

        // 2. Check each product's status & send email accordingly
        const emailNotifType = getEmailNotifType(scrapedProduct, currentPrice)
      })
    )
  } catch (error) {
    throw new Error(`Error in GET:${error}`)
  }
}
