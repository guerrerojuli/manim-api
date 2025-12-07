#!/bin/bash

API_URL="http://localhost:3001"

echo "======================================"
echo "Testing Manim API (Synchronous)"
echo "======================================"
echo ""

# Test 1: Health check
echo "1. Testing health check..."
curl -s "$API_URL/health" | jq '.'
echo ""

# Test 2: Compile a simple video
echo "2. Compiling a simple Manim scene..."
echo "   (This will take 30-60 seconds - the request waits for completion)"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/api/compile" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "from manim import *\n\nclass TestScene(Scene):\n    def construct(self):\n        circle = Circle()\n        text = Text(\"Hello!\").next_to(circle, DOWN)\n        self.play(Create(circle), Write(text))\n        self.wait(1)"
  }')

echo "$RESPONSE" | jq '.'
echo ""

# Check if compilation was successful
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

if [ "$SUCCESS" = "true" ]; then
  echo "✅ Compilation successful!"
  VIDEO_URL=$(echo "$RESPONSE" | jq -r '.url')
  echo "📹 Video URL: $VIDEO_URL"
  echo ""
  echo "To download the video:"
  echo "  curl '$VIDEO_URL' --output video.mp4"
else
  echo "❌ Compilation failed"
  echo "Error: $(echo "$RESPONSE" | jq -r '.error')"
fi

echo ""
echo "======================================"
