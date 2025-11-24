#!/bin/bash
# Script to push the latest mobile app build fixes to GitHub

cd "/home/tokyo/Desktop/rootwise app"

echo "📦 Current commits ready to push:"
echo ""
git log origin/main..HEAD --oneline
echo ""

read -p "Push these commits to GitHub? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "🚀 Pushing to GitHub..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully pushed!"
        echo ""
        echo "🔗 View builds at:"
        echo "   https://github.com/helloworldxdwastaken/rootwise-app/actions"
    else
        echo "❌ Push failed. You may need to:"
        echo "   1. Set up a Personal Access Token: https://github.com/settings/tokens"
        echo "   2. Use it as your password when prompted"
        echo "   Or configure SSH keys: https://github.com/settings/keys"
    fi
else
    echo "Push cancelled."
fi

