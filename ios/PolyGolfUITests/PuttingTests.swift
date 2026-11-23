import XCTest

final class PuttingTests: XCTestCase {
    @MainActor
    func testOpeningPutt() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-freshPracticeSession"]
        app.launch()

        XCTAssertTrue(app.buttons["Hold for power"].waitForExistence(timeout: 90))
        app.buttons["Aim left one degree"].tap()
        app.buttons["Aim right one degree"].tap()
        app.switches["Set power"].tap()
        let slider = app.sliders["Shot power"]
        let thumb = slider.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        thumb.press(forDuration: 0.15, thenDragTo:
            slider.coordinate(withNormalizedOffset: CGVector(dx: 0.8, dy: 0.5)))
        let power = app.staticTexts.matching(NSPredicate(format:
            "label MATCHES %@", "Power · (7[5-9]|8[0-5])%")).firstMatch
        XCTAssertTrue(power.exists, app.debugDescription)
        app.buttons["Swing"].tap()

        let nextLesson = app.buttons["Try the driver"]
        XCTAssertTrue(nextLesson.waitForExistence(timeout: 60), app.debugDescription)
        let proof = XCTAttachment(screenshot: app.screenshot())
        proof.name = "Willow Practice Green completed"
        proof.lifetime = .keepAlways
        add(proof)

        nextLesson.tap()
        let start = app.buttons["Hold for power"]
        XCTAssertTrue(start.waitForExistence(timeout: 60))
        app.buttons["Next club"].tap()
        start.press(forDuration: 0.8)
        app.buttons["Swing"].tap()
        XCTAssertTrue(app.buttons["Try another drive"].waitForExistence(timeout: 90), app.debugDescription)
    }
}
